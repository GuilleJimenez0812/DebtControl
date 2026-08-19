import re
import subprocess

out = subprocess.check_output(["gh", "issue", "view", "119", "--json", "body", "--jq", ".body"]).decode("utf-8")

decision = "- [#120 Update database schema for module-level access](https://github.com/GuilleJimenez0812/DebtControl/issues/120) — Creada tabla user_modules y estructura en el backend.\n"
out = out.replace("## Decisions so far\n", "## Decisions so far\n\n" + decision)

with open("map_body_updated.md", "w") as f:
    f.write(out)
