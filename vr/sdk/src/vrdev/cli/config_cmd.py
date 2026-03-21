"""``vr config`` - View and initialize vr.dev configuration."""

from __future__ import annotations

import click


@click.group()
def config() -> None:
    """Manage vr.dev configuration."""


@config.command()
def show() -> None:
    """Display current configuration (with secrets masked)."""
    from ..core.config import get_config, _DEFAULT_CONFIG_FILE

    cfg = get_config()
    click.echo(f"Config file: {_DEFAULT_CONFIG_FILE}")
    click.echo(f"  exists: {_DEFAULT_CONFIG_FILE.is_file()}")
    click.echo()

    click.echo("[openai]")
    masked_key = _mask(cfg.openai.api_key)
    click.echo(f"  api_key     = {masked_key}")
    click.echo(f"  model       = {cfg.openai.model}")
    click.echo(f"  temperature = {cfg.openai.temperature}")
    click.echo(f"  max_tokens  = {cfg.openai.max_tokens}")
    click.echo()

    click.echo("[imap]")
    click.echo(f"  host     = {cfg.imap.host}")
    click.echo(f"  port     = {cfg.imap.port}")
    click.echo(f"  username = {cfg.imap.username}")
    click.echo(f"  password = {_mask(cfg.imap.password)}")
    click.echo(f"  use_ssl  = {cfg.imap.use_ssl}")
    click.echo()

    click.echo("[http]")
    click.echo(f"  timeout = {cfg.http.timeout}")


@config.command()
@click.option("--force", is_flag=True, help="Overwrite existing config file")
def init(force: bool) -> None:
    """Create a default config file at ~/.vrdev/config.toml."""
    from ..core.config import VrConfig, _DEFAULT_CONFIG_FILE

    if _DEFAULT_CONFIG_FILE.is_file() and not force:
        click.echo(f"Config already exists at {_DEFAULT_CONFIG_FILE}")
        click.echo("Use --force to overwrite.")
        return

    _DEFAULT_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    cfg = VrConfig()
    _DEFAULT_CONFIG_FILE.write_text(cfg.to_toml())
    click.echo(f"✅ Created config at {_DEFAULT_CONFIG_FILE}")
    click.echo("Edit this file to set your API keys and credentials.")


def _mask(value: str) -> str:
    """Mask a secret value for display."""
    if not value:
        return "(not set)"
    if len(value) <= 8:
        return "***"
    return value[:4] + "..." + value[-4:]
