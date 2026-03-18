# arXiv submission notes

## Metadata

- Primary category: cs.GT (Computer Science and Game Theory)
- Secondary categories: cs.DC (Distributed, Parallel, and Cluster Computing), cs.CR (Cryptography and Security)
- Title: Backpressure Economics: Capacity-Constrained Monetary Flow Control for Agent Economies
- Comments: 18 pages, 8 figures, code at https://github.com/backproto/backproto

## Files to include

From `docs/paper/`:

```
main.tex
bpe.bib
sections/00-abstract.tex
sections/01-introduction.tex
sections/02-background.tex
sections/03-model.tex
sections/03b-pricing.tex
sections/03c-offchain.tex
sections/04-throughput.tex
sections/05-protocol.tex
sections/06-security.tex
sections/06b-verification.tex
sections/07-evaluation.tex
sections/08-discussion.tex
sections/08a-implementation.tex
sections/08b-extensions.tex
sections/09-conclusion.tex
figures/ (all .pdf or .png figures)
```

## Pre-submission checklist

- [ ] Compile locally with pdflatex (install MacTeX or use Overleaf)
- [ ] Verify all citations resolve (run bibtex after pdflatex)
- [ ] Check figure references all resolve
- [ ] Verify page count (target: under 20 pages)
- [ ] Remove any TODO or FIXME comments
- [ ] Ensure all URLs use \url{} command
- [ ] Check that the new implementation section (08a) references resolve
- [ ] Verify Spider, Celer, Malavolta citations render correctly
- [ ] Package as .tar.gz with flat structure (no nested directories on arXiv)

## Submission steps

1. Create account at arxiv.org (if needed)
2. Upload .tar.gz
3. Select cs.GT as primary, cross-list to cs.DC and cs.CR
4. Add abstract (copy from 00-abstract.tex)
5. Submit and wait for moderation (typically 1-2 business days)
6. Once live, announce on X/Bluesky/Farcaster with link

## Conference targets

- AFT 2026 (Advances in Financial Technologies) — LIPIcs format required
- IEEE S&B (Security and Blockchain)
- Token Engineering Commons workshops
- FC 2027 (Financial Cryptography) — if timeline permits
