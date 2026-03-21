"""Main CLI group for the ``vr`` command."""

import click

from vrdev import __version__


@click.group()
@click.version_option(version=__version__, prog_name="vr")
def cli() -> None:
    """vr.dev - Verifiable Rewards for Real-World AI Agent Tasks."""


# ── Register subcommands ─────────────────────────────────────────────────────
from .verify import verify  # noqa: E402
from .test_cmd import test  # noqa: E402
from .skill import skill  # noqa: E402
from .config_cmd import config  # noqa: E402
from .registry_cmd import registry  # noqa: E402
from .mcp_cmd import mcp  # noqa: E402
from .export_cmd import export  # noqa: E402
from .inspect_cmd import inspect  # noqa: E402
from .compose_cmd import compose  # noqa: E402
from .batch_cmd import batch  # noqa: E402
from .generate_cmd import generate  # noqa: E402

cli.add_command(verify)
cli.add_command(test)
cli.add_command(skill)
cli.add_command(config)
cli.add_command(registry)
cli.add_command(mcp)
cli.add_command(export)
cli.add_command(inspect)
cli.add_command(compose)
cli.add_command(batch)
cli.add_command(generate)
