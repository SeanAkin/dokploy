import {
	findRegistryByIdWithCredentials,
	safeDockerLoginCommand,
} from "../../services/registry";
import type { ApplicationNested } from "../builders";

export const buildRemoteDocker = async (application: ApplicationNested) => {
	const { registryUrl, dockerImage, username, password, registry } = application;

	if (!dockerImage) {
		throw new Error("Docker image not found");
	}

	// Prefer inline application credentials; otherwise fall back to the linked
	// registry. Registry creds are stripped from the relation, so fetch them.
	let authUser: string | null = username ?? null;
	let authPass: string | null = password ?? null;
	let authUrl: string | null = registryUrl ?? null;

	if ((!authUser || !authPass) && registry) {
		const r = await findRegistryByIdWithCredentials(registry.registryId);
		authUser = r.username;
		authPass = r.password;
		authUrl = r.registryUrl;
	}

	let command = `\necho "Pulling ${dockerImage}";\n`;

	if (authUser && authPass) {
		command += `\n${safeDockerLoginCommand(authUrl ?? undefined, authUser, authPass)}\n`;
	}

	command += `
docker pull ${dockerImage} 2>&1 || {
  echo "❌ Pulling image failed";
  exit 1;
}

echo "✅ Pulling image completed.";
`;
	return command;
};
