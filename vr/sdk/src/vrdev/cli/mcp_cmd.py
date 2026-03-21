"""``vr mcp`` - Start the vr.dev MCP server."""

from __future__ import annotations

import click


@click.group()
def mcp():
    """Model Context Protocol (MCP) server for vr.dev."""


@mcp.command()
def serve():
    """Start the MCP server on stdio transport.

    Use this with Claude Desktop or Cursor - add to your MCP config::

        {
            "mcpServers": {
                "vrdev": {
                    "command": "vr",
                    "args": ["mcp", "serve"]
                }
            }
        }
    """
    try:
        from ..adapters.mcp_server import run_stdio
    except ImportError:
        click.secho(
            "MCP support requires the 'mcp' package.\n"
            "Install with: pip install vrdev[mcp]",
            fg="red",
        )
        raise SystemExit(1)

    click.echo("Starting vr.dev MCP server on stdio...", err=True)
    run_stdio()
