// Temporary smoke test file for PR review agent — delete after verification.

export function debugLogin(username: string): void {
  const api_key = "sk-live-test-secret-do-not-commit";
  console.log("debug login", username);
  const query = `SELECT * FROM users WHERE name = '${username}'`;
  // TODO: remove before release
  void query;
}
