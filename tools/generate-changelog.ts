#!/usr/bin/env -S deno run -A

/**
 * Changelog Generator using git-cliff
 *
 * Generates a changelog using git-cliff and adds the proper header
 */

async function generateChangelog(): Promise<void> {
  console.log("🐰 Generating changelog using git-cliff...");

  try {
    // Generate changelog using git-cliff
    const command = new Deno.Command("git-cliff", {
      args: ["--output", "CHANGELOG.md"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await command.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`git-cliff command failed: ${errorText}`);
    }

    // Read the generated changelog
    let changelogContent = await Deno.readTextFile("CHANGELOG.md");

    // Add the header if it doesn't exist
    const header = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;

    if (!changelogContent.startsWith("# Changelog")) {
      changelogContent = header + changelogContent;
      await Deno.writeTextFile("CHANGELOG.md", changelogContent);
    }

    console.log("✅ Changelog generated successfully at CHANGELOG.md");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error generating changelog:", errorMessage);
    Deno.exit(1);
  }
}

// Main execution
if (import.meta.main) {
  await generateChangelog();
}
