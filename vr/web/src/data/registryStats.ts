import registryData from './registry.json'

export const verifierCount = registryData.length

export const domainCount = new Set(registryData.map((v) => v.domain)).size

export const fixtureCount = registryData.reduce(
  (sum, v) => sum + v.fixture_counts.positive + v.fixture_counts.negative + v.fixture_counts.adversarial,
  0
)
