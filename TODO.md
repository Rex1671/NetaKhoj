# Integrate Appwrite Client for Candidate Data Fetching

## Tasks
- [ ] Update `findNeta.js` to use `fetchCandidateDataViaAppwrite` instead of direct HTML fetching
- [ ] Transform Appwrite response to match existing data structure expectations
- [ ] Update error handling in `getCandidateData`
- [ ] Test the integration locally
- [ ] Deploy and verify in Railway environment
- [ ] Remove unused Puppeteer dependencies if no longer needed

## Notes
- Appwrite function returns structured JSON data directly
- Need to map Appwrite response fields to existing code expectations (liabilities, immovableAssets, etc.)
- Ensure fallback to search URL if Appwrite fails
