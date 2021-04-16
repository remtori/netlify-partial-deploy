import { ReadStream } from 'fs';

type NetlifyClient = any;

// Map public path to sha1 hex encoded hash
export type FileIndex = {
	[publicPath: string]: string;
};

export type Status = {
	// Name of step
	type: string;

	// Message to print
	msg: string;

	phase: 'start' | 'progress' | 'stop';
};

export type DeploySiteOptions = {
	draft: boolean;
	message: string;
	deployTimeout: number;
	concurrentUpload: number;
	syncFileLimit: number;
	maxRetry: number;
	statusCb: (status: Status) => void;
	deployId: string;
};

export default function deploySite(
	api: NetlifyClient,
	siteId: string,
	fileIndex: FileIndex,
	inputStreamGetter: (publicPath: string) => ReadStream,
	options?: Partial<DeploySiteOptions>
): Promise<{
	deployId: string;
	deploy: any;
	uploadList: string[];
}>;
