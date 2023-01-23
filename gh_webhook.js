const http = require("http");
const crypto = require("crypto");
const exec = require("child_process").exec;

const GH_WEBHOOK_PORT = process.env.GH_WEBHOOK_PORT || 5000;
const GH_WEBHOOK_SECRET = process.env.GH_WEBHOOK_SECRET;
const REPO_PATH = "/home/ubuntu/sofchi_server";

const BUILD_CMD = "NODE_ENV=production npm run build";
const PM2_CMD = "cd ~ && pm2 startOrRestart ecosystem.config.js";

const server = http
	.createServer((req, res) => {
		if (
			req.method === "POST" &&
			req.url === "/gh-webhook" &&
			req.headers["content-type"] === "application/json"
		) {

				console.log("POST request from gh");

				let chunks = [];

				req.on("data", (chunk) => {
					chunks.push(chunk);
				});

				req.on('end', () => {
					// Parse chunks buffer to string
					let body = chunks.toString();

					// Calculate signature
					let signature = 'sha256=' +
					crypto.createHmac('SHA256', GH_WEBHOOK_SECRET).update(body).digest('hex');

					// If signatures match, pull changes from gh and rebuild the app
					if (req.headers['x-hub-signature-256'] === signature) {
						let command = `cd ${REPO_PATH} && git pull && ${BUILD_CMD} && ${PM2_CMD}`;

						// execute shell command to pull repo, build the app and restart the process
						exec(command, (error, stdout, stderr) => {
							if (error) {
								console.error(`exec error: ${error}`);
								return;
							}

							console.log(`stdout: ${stdout}`);
							console.log(`stderr: ${stderr}`);
						});
					} else {
						console.log('Signatures do not match');
					}

					res.end('ok');
				});
		}
	})

	server.listen(GH_WEBHOOK_PORT, () => {
		console.log(`Server listening for gh webhooks at port ${GH_WEBHOOK_PORT}`);
	});
