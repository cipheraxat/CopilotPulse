// Live review agent test — safe to delete after verifying PR comments.

export function unsafeDebugHandler(username: string): void {
  const api_key = "sk-or-live-test-key-should-be-flagged";
  console.log("debug user", username);
  const query = `SELECT * FROM sessions WHERE user = '${username}'`;
  // TODO: remove this test helper before release
  void query;
}
