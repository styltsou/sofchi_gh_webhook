const GH_WEBHOOK_PORT = process.env.GH_WEBHOOK_PORT || 5000;
const GH_WEBHOOK_SECRET = process.env.GH_WEBHOOK_SECRET;
const REPO_PATH = "/home/ubuntu/sofchi_server";

const http = require("http");
const crypto = require("crypto");
const exec = require("child_process").exec;

const BUILD_CMD = "NODE_ENV=production npm run build";
const PM2_CMD = "cd ~ && pm2 startOrRestart ecosystem.config.js";

http
	.createServer((req, res) => {
		if (
			req.method === "POST" &&
			req.url === "/gh-webhook" &&
			req.headers["content-type"] === "application/json"
		) {
			req.on("data", (chunk) => {
				let signature =
					"sha1" +
					crypto
						.createHmac("sha1", GH_WEBHOOK_SECRET)
						.update(chunk.toString())
						.digest("hex");

				if (req.headers["x-hub-signature"] == signature) {
					exec(
						`cd ${REPO_PATH} && git pull && ${BUILD_CMD} && ${PM2_CMD}`,
						(error, stdout, stderr) => {
							if (error) {
								console.error(`exec error: ${error}`);
								return;
							}

							console.log(`stdout: ${stdout}`);
							console.log(`stderr: ${stderr}`);
						}
					);
				}
			});

			res.end();
		}
	})
	.listen(GH_WEBHOOK_PORT);
