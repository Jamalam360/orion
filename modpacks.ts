const decoder = new TextDecoder();

export default async function deployModpackUpdate(
  subpath: string,
): Promise<{ response: Record<string, string>; code: number }> {
  try {
    const command = new Deno.Command("git", {
      args: ["pull"],
      cwd: `/content/${subpath}`,
    });
    const { code, stdout, stderr } = await command.output();
    console.log(
      `Orion API updated modpack /content/${subpath} with code ${code}. STDOUT and STDERR are displayed below.`,
    );
    console.log(decoder.decode(stdout));
    console.log(decoder.decode(stderr));

    if (code != 0) {
      return {
        code: 500,
        response: {
          status: "Failed to run `git pull`",
          stdout: decoder.decode(stdout),
          stderr: decoder.decode(stderr),
        },
      };
    }

    return {
      code: 200,
      response: {
        status: "Successfully ran `git pull` in directory `/content/" +
          subpath + "`",
      },
    };
  } catch (err) {
    console.log("Orion API encountered an error:", err);
    return {
      code: 500,
      response: {
        status: "An unknown error was encountered",
        err: err,
      },
    };
  }
}
