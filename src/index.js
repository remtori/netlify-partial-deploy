const cleanDeep = require('clean-deep');

const {
	DEFAULT_DEPLOY_TIMEOUT,
	DEFAULT_CONCURRENT_UPLOAD,
	DEFAULT_SYNC_LIMIT,
	DEFAULT_MAX_RETRY,
} = require('./constants');
const uploadFiles = require('./upload_files');
const { waitForDiff, waitForDeploy, getUploadList } = require('./util');

async function deploySite(
	api,
	siteId,
	files,
	getInputStreamFromPath,
	{
		draft = false,
		// API calls this the 'title'
		message: title,
		deployTimeout = DEFAULT_DEPLOY_TIMEOUT,
		concurrentUpload = DEFAULT_CONCURRENT_UPLOAD,
		syncFileLimit = DEFAULT_SYNC_LIMIT,
		maxRetry = DEFAULT_MAX_RETRY,
		statusCb = () => {},
		deployId: deployIdOpt = null,
	} = {}
) {
	const filesCount = Object.keys(files).length;

	statusCb({
		type: 'hashing',
		msg: `Finished hashing ${filesCount} files`,
		phase: 'stop',
	});

	if (filesCount === 0) {
		throw new Error('No files to deploy');
	}

	statusCb({
		type: 'create-deploy',
		msg: 'CDN diffing files...',
		phase: 'start',
	});

	let deploy;
	let deployParams = cleanDeep({
		siteId,
		body: {
			files,
			async: Object.keys(files).length > syncFileLimit,
			draft,
		},
	});

	if (deployIdOpt === null) {
		if (title) {
			deployParams = { ...deployParams, title };
		}
		deploy = await api.createSiteDeploy(deployParams);
	} else {
		deployParams = { ...deployParams, deploy_id: deployIdOpt };
		deploy = await api.updateSiteDeploy(deployParams);
	}

	if (deployParams.body.async)
		deploy = await waitForDiff(api, deploy.id, siteId, deployTimeout);

	const { id: deployId, required: requiredFiles } = deploy;

	statusCb({
		type: 'create-deploy',
		msg: `CDN requesting ${requiredFiles.length} files`,
		phase: 'stop',
	});

	const uploadList = getUploadList(requiredFiles, files);

	await uploadFiles(api, deployId, uploadList, getInputStreamFromPath, {
		concurrentUpload,
		statusCb,
		maxRetry,
	});

	statusCb({
		type: 'wait-for-deploy',
		msg: 'Waiting for deploy to go live...',
		phase: 'start',
	});
	deploy = await waitForDeploy(api, deployId, siteId, deployTimeout);

	statusCb({
		type: 'wait-for-deploy',
		msg: draft ? 'Draft deploy is live!' : 'Deploy is live!',
		phase: 'stop',
	});

	const deployManifest = {
		deployId,
		deploy,
		uploadList,
	};

	return deployManifest;
}

module.exports = deploySite;
