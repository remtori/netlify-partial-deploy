const pWaitFor = require('p-wait-for');

const { DEPLOY_POLL } = require('./constants');

// poll an async deployId until its done diffing
async function waitForDiff(api, deployId, siteId, timeout) {
	// capture ready deploy during poll
	let deploy;

	const loadDeploy = async () => {
		const siteDeploy = await api.getSiteDeploy({ siteId, deployId });

		switch (siteDeploy.state) {
			// https://github.com/netlify/bitballoon/blob/master/app/models/deploy.rb#L21-L33
			case 'error': {
				const deployError = new Error(`Deploy ${deployId} had an error`);
				deployError.deploy = siteDeploy;
				throw deployError;
			}
			case 'prepared':
			case 'uploading':
			case 'uploaded':
			case 'ready': {
				deploy = siteDeploy;
				return true;
			}
			case 'preparing':
			default: {
				return false;
			}
		}
	};

	await pWaitFor(loadDeploy, {
		interval: DEPLOY_POLL,
		timeout,
		message: 'Timeout while waiting for deploy',
	});

	return deploy;
}

// Poll a deployId until its ready
async function waitForDeploy(api, deployId, siteId, timeout) {
	// capture ready deploy during poll
	let deploy;

	const loadDeploy = async () => {
		const siteDeploy = await api.getSiteDeploy({ siteId, deployId });
		switch (siteDeploy.state) {
			// https://github.com/netlify/bitballoon/blob/master/app/models/deploy.rb#L21-L33
			case 'error': {
				const deployError = new Error(`Deploy ${deployId} had an error`);
				deployError.deploy = siteDeploy;
				throw deployError;
			}
			case 'ready': {
				deploy = siteDeploy;
				return true;
			}
			case 'preparing':
			case 'prepared':
			case 'uploaded':
			case 'uploading':
			default: {
				return false;
			}
		}
	};

	await pWaitFor(loadDeploy, {
		interval: DEPLOY_POLL,
		timeout,
		message: 'Timeout while waiting for deploy',
	});

	return deploy;
}

function getUploadList(requiredHashes, pathToHash) {
	const hashToPath = {};
	for (const path in pathToHash) {
		if (Array.isArray(hashToPath[pathToHash[path]])) {
			hashToPath[pathToHash[path]].push(path);
		} else {
			hashToPath[pathToHash[path]] = [path];
		}
	}

	return requiredHashes
		.flatMap((hash) => hashToPath[hash])
		.map((filePath) => filePath.replace(/\\/g, '/'));
}

module.exports = {
	waitForDiff,
	waitForDeploy,
	getUploadList,
};
