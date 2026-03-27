import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// We need to set up the mock storage path before importing CopilotDataReader
let tmpStoragePath: string;

vi.mock('../utils/paths', () => ({
  getCopilotChatStoragePath: () => tmpStoragePath,
  getWorkspaceStorageBasePath: () => '/nonexistent-workspace-storage',
}));

vi.mock('sql.js', () => ({
  default: () => Promise.resolve({}),
}));

import { CopilotDataReader } from '../services/CopilotDataReader';

describe('CopilotDataReader', () => {
  let reader: CopilotDataReader;

  beforeEach(() => {
    tmpStoragePath = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-test-'));
    reader = new CopilotDataReader();
  });

  afterEach(() => {
    fs.rmSync(tmpStoragePath, { recursive: true, force: true });
  });

  it('should initialize when storage path exists', async () => {
    expect(await reader.initialize('/fake/wasm')).toBe(true);
  });

  it('should return empty array when no files exist', async () => {
    await reader.initialize('/fake/wasm');
    const sessions = await reader.scanSessions();
    expect(sessions).toEqual([]);
  });

  it('should parse a single conversation JSON file', async () => {
    await reader.initialize('/fake/wasm');

    const conversation = {
      id: 'conv-1',
      title: 'Test Conversation',
      workspaceFolder: '/home/user/project',
      created: Date.now() - 60000,
      lastUpdated: Date.now(),
      model: 'gpt-4o',
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello, how do I fix this bug?', timestamp: Date.now() - 50000 },
        { id: 'msg-2', role: 'assistant', content: 'You need to update the handler.', timestamp: Date.now() - 40000 },
      ],
    };

    fs.writeFileSync(
      path.join(tmpStoragePath, 'conversation.json'),
      JSON.stringify(conversation),
    );

    const sessions = await reader.scanSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('conv-1');
    expect(sessions[0].title).toBe('Test Conversation');
    expect(sessions[0].messages).toHaveLength(2);
    expect(sessions[0].model).toBe('gpt-4o');
    expect(sessions[0].workspaceName).toBe('project');
  });

  it('should parse an array of conversations', async () => {
    await reader.initialize('/fake/wasm');

    const conversations = [
      {
        id: 'conv-1',
        title: 'First',
        messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
      },
      {
        id: 'conv-2',
        title: 'Second',
        messages: [{ id: 'm2', role: 'user', content: 'World' }],
      },
    ];

    fs.writeFileSync(
      path.join(tmpStoragePath, 'sessions.json'),
      JSON.stringify(conversations),
    );

    const sessions = await reader.scanSessions();
    expect(sessions).toHaveLength(2);
  });

  it('should parse a wrapper object with conversations array', async () => {
    await reader.initialize('/fake/wasm');

    const data = {
      conversations: [
        { id: 'c1', title: 'Wrapped', messages: [{ role: 'user', content: 'Test' }] },
      ],
    };

    fs.writeFileSync(
      path.join(tmpStoragePath, 'wrapped.json'),
      JSON.stringify(data),
    );

    const sessions = await reader.scanSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Wrapped');
  });

  it('should parse JSONL files', async () => {
    await reader.initialize('/fake/wasm');

    const lines = [
      JSON.stringify({ id: 'j1', messages: [{ role: 'user', content: 'Line 1' }] }),
      JSON.stringify({ id: 'j2', messages: [{ role: 'user', content: 'Line 2' }] }),
    ].join('\n');

    fs.writeFileSync(path.join(tmpStoragePath, 'data.jsonl'), lines);

    const sessions = await reader.scanSessions();
    expect(sessions).toHaveLength(2);
  });

  it('should scan subdirectories', async () => {
    await reader.initialize('/fake/wasm');

    const subDir = path.join(tmpStoragePath, 'subdir');
    fs.mkdirSync(subDir);

    fs.writeFileSync(
      path.join(subDir, 'conv.json'),
      JSON.stringify({ id: 'sub-1', messages: [{ role: 'user', content: 'Sub' }] }),
    );

    const sessions = await reader.scanSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('sub-1');
  });

  it('should skip malformed JSON files', async () => {
    await reader.initialize('/fake/wasm');

    fs.writeFileSync(path.join(tmpStoragePath, 'bad.json'), 'not valid json {{{');
    fs.writeFileSync(
      path.join(tmpStoragePath, 'good.json'),
      JSON.stringify({ id: 'ok', messages: [{ role: 'user', content: 'OK' }] }),
    );

    const sessions = await reader.scanSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('ok');
  });

  it('should extract tool calls from messages', async () => {
    await reader.initialize('/fake/wasm');

    const conversation = {
      id: 'tc-1',
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Using a tool',
          toolCalls: [
            { id: 'tool-1', name: 'read_file', input: '/path/to/file' },
            { id: 'tool-2', function: { name: 'write_file', arguments: '{}' } },
          ],
        },
      ],
    };

    fs.writeFileSync(
      path.join(tmpStoragePath, 'tools.json'),
      JSON.stringify(conversation),
    );

    const sessions = await reader.scanSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].toolCalls).toHaveLength(2);
    expect(sessions[0].toolCalls[0].name).toBe('read_file');
    expect(sessions[0].toolCalls[1].name).toBe('write_file');
  });

  it('should derive title from first user message when no title', async () => {
    await reader.initialize('/fake/wasm');

    const conversation = {
      id: 'no-title',
      messages: [
        { role: 'user', content: 'How do I implement authentication in my Node.js app?' },
        { role: 'assistant', content: 'You can use passport.js...' },
      ],
    };

    fs.writeFileSync(
      path.join(tmpStoragePath, 'notitle.json'),
      JSON.stringify(conversation),
    );

    const sessions = await reader.scanSessions();
    expect(sessions[0].title).toContain('How do I implement');
  });

  it('should estimate tokens from message content', async () => {
    await reader.initialize('/fake/wasm');

    const conversation = {
      id: 'tokens-test',
      messages: [
        { role: 'user', content: 'a'.repeat(400) }, // ~100 tokens
        { role: 'assistant', content: 'b'.repeat(800) }, // ~200 tokens
      ],
    };

    fs.writeFileSync(
      path.join(tmpStoragePath, 'tokens.json'),
      JSON.stringify(conversation),
    );

    const sessions = await reader.scanSessions();
    expect(sessions[0].inputTokens).toBe(100);
    expect(sessions[0].outputTokens).toBe(200);
    expect(sessions[0].totalTokens).toBe(300);
  });

  it('should normalize message roles', async () => {
    await reader.initialize('/fake/wasm');

    const conversation = {
      id: 'roles-test',
      messages: [
        { role: 'human', content: 'User message' },
        { role: 'bot', content: 'Bot reply' },
        { role: 'function', content: 'Tool output' },
      ],
    };

    fs.writeFileSync(
      path.join(tmpStoragePath, 'roles.json'),
      JSON.stringify(conversation),
    );

    const sessions = await reader.scanSessions();
    const roles = sessions[0].messages.map((m) => m.role);
    expect(roles).toEqual(['user', 'assistant', 'tool']);
  });
});
