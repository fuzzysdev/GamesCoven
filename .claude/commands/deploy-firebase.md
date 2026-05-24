Build and deploy the Grimoire & Games app to Firebase.

Steps:
1. Run `npm run build` with the Bash tool. If it fails, report the errors and stop.
2. Deploy using the `mcp__firebase__firebase_deploy` MCP tool with `only: "hosting,firestore"`.
3. Poll the result using `mcp__firebase__firebase_deploy_status` with the returned jobId until status is "success" or "error".
4. Report the outcome. On success, remind the user the live URL is grimoire-games.web.app.

Project ID: grimoire-games
Live URL: https://grimoire-games.web.app
