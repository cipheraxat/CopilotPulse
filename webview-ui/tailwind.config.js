/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'vscode-bg': 'var(--vscode-editor-background)',
        'vscode-fg': 'var(--vscode-editor-foreground)',
        'vscode-sidebar-bg': 'var(--vscode-sideBar-background)',
        'vscode-sidebar-fg': 'var(--vscode-sideBar-foreground)',
        'vscode-input-bg': 'var(--vscode-input-background)',
        'vscode-input-fg': 'var(--vscode-input-foreground)',
        'vscode-input-border': 'var(--vscode-input-border)',
        'vscode-button-bg': 'var(--vscode-button-background)',
        'vscode-button-fg': 'var(--vscode-button-foreground)',
        'vscode-button-hover': 'var(--vscode-button-hoverBackground)',
        'vscode-badge-bg': 'var(--vscode-badge-background)',
        'vscode-badge-fg': 'var(--vscode-badge-foreground)',
        'vscode-border': 'var(--vscode-panel-border)',
        'vscode-list-hover': 'var(--vscode-list-hoverBackground)',
        'vscode-list-active': 'var(--vscode-list-activeSelectionBackground)',
        'vscode-link': 'var(--vscode-textLink-foreground)',
        'vscode-error': 'var(--vscode-errorForeground)',
        'vscode-warning': 'var(--vscode-editorWarning-foreground)',
        'vscode-success': 'var(--vscode-testing-iconPassed)',
        'vscode-description': 'var(--vscode-descriptionForeground)',
      },
      fontFamily: {
        vscode: 'var(--vscode-font-family)',
        'vscode-editor': 'var(--vscode-editor-font-family)',
      },
      fontSize: {
        'vscode': 'var(--vscode-font-size)',
        'vscode-editor': 'var(--vscode-editor-font-size)',
      },
    },
  },
  plugins: [],
};
