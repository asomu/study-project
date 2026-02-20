# Agent Roster

- Version: v1.0
- Date: 2026-02-20

## Purpose

Define specialist agents to run before and during development for quality and consistency.

## Agents

1. Architecture Expert
- Skill: `study-architecture-expert`
- Focus: system boundaries, data model, API contracts, deployment decisions
- Main inputs:
  - `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`
  - `/Users/mark/Documents/project/study-project/docs/02-architecture/*`

2. Review Expert
- Skill: `study-review-expert`
- Focus: severity-ranked findings, regression risk, release readiness
- Main inputs:
  - changed code
  - `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`

3. Test Expert
- Skill: `study-test-expert`
- Focus: Hybrid TDD, test coverage, quality gates
- Main inputs:
  - `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md`
  - feature acceptance criteria

4. UX/UI Expert
- Skill: `study-ux-ui-expert`
- Focus: mobile-first UX, dashboard readability, Figma-driven implementation
- Main inputs:
  - `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`
  - design references or Figma nodes
  - additional design skills (if installed): `frontend-design`, `web-design-guidelines`

5. Documentation Expert
- Skill: `study-documentation-expert`
- Focus: docs quality, traceability, handoff, link integrity
- Main inputs:
  - `/Users/mark/Documents/project/study-project/docs/*`

## Recommended Execution Order

1. `study-architecture-expert`
2. `study-ux-ui-expert`
3. `study-test-expert`
4. `study-review-expert`
5. `study-documentation-expert`

## Notes

- Restart Codex after adding new skills so they can be discovered reliably.
