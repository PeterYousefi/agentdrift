"""Package only built static assets, never environment files or credentials."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path("lovable/.output/public")
with ZipFile("/tmp/agentdrift-frontend.zip", "w", ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(root))
