#!/usr/bin/env -S deno run -A

/**
 * Changelog Generator for White Rabbit
 *
 * Generates a changelog based on git commits and saves it to CHANGELOG.md
 * Parses conventional commit messages and organises them by version tags
 */

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author: string;
  type?: string;
  scope?: string;
  description: string;
  breaking?: boolean;
}

interface VersionSection {
  version: string;
  date: string;
  commits: CommitInfo[];
}

class ChangelogGenerator {
  private commits: CommitInfo[] = [];
  private versions: VersionSection[] = [];

  async generateChangelog(): Promise<void> {
    console.log("🐰 Generating changelog from git commits...");

    await this.fetchCommits();
    await this.organiseByVersions();
    await this.writeChangelog();

    console.log("✅ Changelog generated successfully at CHANGELOG.md");
  }

  private async fetchCommits(): Promise<void> {
    const command = new Deno.Command("git", {
      args: [
        "log",
        "--pretty=format:%H|%ai|%an|%s",
        "--reverse",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`Git command failed: ${errorText}`);
    }

    const output = new TextDecoder().decode(stdout);
    const lines = output.trim().split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      const [hash, date, author, message] = line.split("|");
      const commit = this.parseCommitMessage({
        hash: hash.substring(0, 7), // Short hash
        date,
        author,
        message,
        description: message,
      });

      this.commits.push(commit);
    }

    console.log(`📝 Parsed ${this.commits.length} commits`);
  }

  private parseCommitMessage(commit: Omit<CommitInfo, "type" | "scope" | "breaking">): CommitInfo {
    const message = commit.message;

    // Parse conventional commit format: type(scope): description
    const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)$/;
    const match = message.match(conventionalRegex);

    if (match) {
      const [, type, scope, description] = match;
      return {
        ...commit,
        type,
        scope,
        description,
        breaking: message.includes("BREAKING CHANGE") || message.includes("!"),
      };
    }

    // Fallback for non-conventional commits
    return {
      ...commit,
      type: "misc",
      description: message,
    };
  }

  private async getVersionTags(): Promise<Map<string, string>> {
    const command = new Deno.Command("git", {
      args: [
        "tag",
        "-l",
        "--sort=-version:refname",
        "--format=%(refname:short)|%(creatordate:short)",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();
    const versionMap = new Map<string, string>();

    if (code === 0) {
      const output = new TextDecoder().decode(stdout);
      const lines = output.trim().split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        const [tag, date] = line.split("|");
        if (tag && date) {
          versionMap.set(tag, date);
        }
      }
    }

    return versionMap;
  }

  private async organiseByVersions(): Promise<void> {
    // Simple approach: get all commits and group them by tags
    console.log("🏷️  Organising commits by version tags...");

    // Get all tags with their dates
    const tagCommand = new Deno.Command("git", {
      args: [
        "tag",
        "-l",
        "--sort=-version:refname",
        "--format=%(refname:short)|%(creatordate:short)",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code: tagCode, stdout: tagStdout } = await tagCommand.output();
    const tags: Array<{ name: string; date: string }> = [];

    if (tagCode === 0) {
      const tagOutput = new TextDecoder().decode(tagStdout);
      const tagLines = tagOutput.trim().split("\n");

      for (const line of tagLines) {
        if (line.trim()) {
          const [name, date] = line.split("|");
          if (name && date) {
            tags.push({ name, date });
          }
        }
      }
    }

    console.log(`Found ${tags.length} tags: ${tags.map((t) => t.name).join(", ")}`);

    if (tags.length === 0) {
      // No tags, all commits are unreleased
      this.versions.push({
        version: "Unreleased",
        date: new Date().toISOString().split("T")[0],
        commits: [...this.commits].reverse(),
      });
      console.log(`No tags found, treating all ${this.commits.length} commits as unreleased`);
      return;
    }

    // Get commit ranges for each tag
    const allCommits = [...this.commits].reverse(); // Newest first
    let processedCommits = 0;

    // Add unreleased commits (since latest tag)
    const latestTag = tags[0];
    const unreleasedCommand = new Deno.Command("git", {
      args: ["rev-list", `${latestTag.name}..HEAD`, "--reverse"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code: unreleasedCode, stdout: unreleasedStdout } = await unreleasedCommand.output();
    if (unreleasedCode === 0) {
      const unreleasedHashes = new TextDecoder().decode(unreleasedStdout)
        .trim()
        .split("\n")
        .map((h) => h.substring(0, 7))
        .filter((h) => h);

      if (unreleasedHashes.length > 0) {
        const unreleasedCommits = allCommits.filter((c) => unreleasedHashes.includes(c.hash));
        if (unreleasedCommits.length > 0) {
          this.versions.push({
            version: "Unreleased",
            date: new Date().toISOString().split("T")[0],
            commits: unreleasedCommits,
          });
          processedCommits += unreleasedCommits.length;
        }
      }
    }

    // Process each tagged version
    for (let i = 0; i < tags.length; i++) {
      const currentTag = tags[i];
      const previousTag = tags[i + 1];

      let rangeCommand: Deno.Command;
      if (previousTag) {
        rangeCommand = new Deno.Command("git", {
          args: ["rev-list", `${previousTag.name}..${currentTag.name}`, "--reverse"],
          stdout: "piped",
          stderr: "piped",
        });
      } else {
        rangeCommand = new Deno.Command("git", {
          args: ["rev-list", currentTag.name, "--reverse"],
          stdout: "piped",
          stderr: "piped",
        });
      }

      const { code: rangeCode, stdout: rangeStdout } = await rangeCommand.output();
      if (rangeCode === 0) {
        const tagHashes = new TextDecoder().decode(rangeStdout)
          .trim()
          .split("\n")
          .map((h) => h.substring(0, 7))
          .filter((h) => h);

        const tagCommits = allCommits.filter((c) => tagHashes.includes(c.hash));
        if (tagCommits.length > 0) {
          this.versions.push({
            version: currentTag.name,
            date: currentTag.date,
            commits: tagCommits,
          });
          processedCommits += tagCommits.length;
        }
      }
    }

    console.log(
      `🏷️  Organised ${processedCommits} commits into ${this.versions.length} version sections`,
    );
  }

  private async writeChangelog(): Promise<void> {
    const lines: string[] = [];

    // Header
    lines.push("# Changelog");
    lines.push("");
    lines.push("All notable changes to this project will be documented in this file.");
    lines.push("");
    lines.push("The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),");
    lines.push(
      "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
    );
    lines.push("");

    // Process each version
    for (const version of this.versions) {
      // Version header
      if (version.version === "Unreleased") {
        lines.push(`## [${version.version}]`);
      } else {
        lines.push(`## [${version.version}] - ${version.date}`);
      }
      lines.push("");

      // Group commits by type
      const commitsByType = this.groupCommitsByType(version.commits);

      // Order of sections
      const sectionOrder = [
        { key: "feat", title: "### Added" },
        { key: "fix", title: "### Fixed" },
        { key: "docs", title: "### Documentation" },
        { key: "style", title: "### Style" },
        { key: "refactor", title: "### Refactored" },
        { key: "perf", title: "### Performance" },
        { key: "test", title: "### Tests" },
        { key: "chore", title: "### Maintenance" },
        { key: "misc", title: "### Other" },
      ];

      for (const section of sectionOrder) {
        const commits = commitsByType.get(section.key);
        if (commits && commits.length > 0) {
          lines.push(section.title);
          lines.push("");

          for (const commit of commits) {
            const scope = commit.scope ? `**${commit.scope}**: ` : "";
            const breaking = commit.breaking ? " ⚠️ BREAKING" : "";
            lines.push(`- ${scope}${commit.description}${breaking} ([${commit.hash}])`);
          }
          lines.push("");
        }
      }
    }

    // Write to file
    const content = lines.join("\n");
    await Deno.writeTextFile("CHANGELOG.md", content);
  }

  private groupCommitsByType(commits: CommitInfo[]): Map<string, CommitInfo[]> {
    const grouped = new Map<string, CommitInfo[]>();

    for (const commit of commits) {
      const type = commit.type || "misc";
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(commit);
    }

    return grouped;
  }
}

// Main execution
if (import.meta.main) {
  try {
    const generator = new ChangelogGenerator();
    await generator.generateChangelog();
  } catch (error) {
    console.error("❌ Error generating changelog:", error.message);
    Deno.exit(1);
  }
}
