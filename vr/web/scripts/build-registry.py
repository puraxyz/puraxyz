#!/usr/bin/env python3
"""Aggregate VERIFIER.json files into a single static JSON for the Next.js frontend."""

import json
import os
import glob

REGISTRY_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'vr-dev', 'registry', 'verifiers')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'registry.json')

verifiers = []
for path in sorted(glob.glob(os.path.join(REGISTRY_DIR, '*', 'VERIFIER.json'))):
    with open(path) as f:
        v = json.load(f)
    base = os.path.dirname(path)
    fixtures = {}
    for ft in ['positive', 'negative', 'adversarial']:
        fp = os.path.join(base, f'{ft}.json')
        if os.path.exists(fp):
            with open(fp) as ff:
                fixtures[ft] = len(json.load(ff).get('fixtures', []))
        else:
            fixtures[ft] = 0
    verifiers.append({
        'id': v['id'],
        'version': v.get('version', '0.1.0'),
        'tier': v['tier'],
        'domain': v['domain'],
        'task_type': v.get('task_type', ''),
        'description': v['description'],
        'scorecard': v.get('scorecard', {}),
        'permissions_required': v.get('permissions_required', []),
        'contributor': v.get('contributor', 'vr.dev'),
        'created_at': v.get('created_at', ''),
        'source_citation': v.get('source_citation', ''),
        'latency_p50_ms': v.get('latency_p50_ms', None),
        'fixture_counts': fixtures,
    })

with open(OUTPUT_PATH, 'w') as f:
    json.dump(verifiers, f, indent=2)

print(f'Wrote {len(verifiers)} verifiers to {OUTPUT_PATH}')
