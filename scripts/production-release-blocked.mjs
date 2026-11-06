console.error([
  'Direct Production release is blocked.',
  'Use the authenticated BuddhaBloom admin Staging/Release workflow.',
  'The owner must record Staging and Production Candidate approval in the backend UI.',
  'Agents must not approve or promote a release on the owner\'s behalf.',
].join('\n'))

process.exitCode = 1
