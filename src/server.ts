import app from "./app";
import { env } from "./config/env";

// Vercel's @vercel/node runtime imports this file and calls the exported
// Express app directly as a request handler for every invocation — it never
// runs the code below. `require.main === module` is only true when this file
// is executed directly with `node dist/server.js` (traditional hosting, or
// `npm start`), so app.listen() only happens there and never inside the
// serverless environment.
if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

export default app;
