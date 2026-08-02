import {
	findRegistryByIdWithCredentials,
	safeDockerLoginCommand,
} from "@dokploy/server/services/registry";
import { quote } from "shell-quote";
import type { ApplicationNested } from "../builders";

export const buildRemoteDocker = async (application: ApplicationNested) => {
	const { registryUrl, dockerImage, username, password, registry } = application;

	try {
		if (!dockerImage) {
			throw new Error("Docker image not found");
		}
		let command = `
echo ${quote([`Pulling ${dockerImage}`])};
		`;

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

		if (authUser && authPass) {
			command += `
if ! ${safeDockerLoginCommand(authUrl || "", authUser, authPass)} 2>&1; then
	echo "❌ Login failed";
	exit 1;
fi
`;
		}

		command += `
docker pull ${quote([dockerImage])} 2>&1 || {
  echo "❌ Pulling image failed";
  exit 1;
}

echo "✅ Pulling image completed.";
`;
		return command;
	} catch (error) {
		throw error;
	}
};
