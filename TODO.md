# TODO: Modify Search Endpoint for Encrypted meow and bhaw

## Overview
Modify the `/prs` endpoint to return encrypted `meow` (candidate_id) and `bhaw` (state) instead of the direct `assetLink` URL. Store mappings of encrypted values to originals for decoding when clients send encoded values in API calls.

## Steps
1. **Add encryption/decryption utilities in candidateService.js**
   - Implement AES-256-CBC encryption/decryption functions.
   - Use a fixed key (can be moved to env later).

2. **Modify candidateService.js _parseResponse method**
   - Parse `assetLink` to extract `meow` (candidate_id) and `bhaw` (state).
   - Encrypt `meow` and `bhaw`.
   - Store mapping (encrypted -> original) in a JSON file using fileStorage.
   - Return encrypted `meow` and `bhaw` in data, remove `assetLink`.

3. **Modify routes/api.js mergeCandidate function**
   - Instead of setting `target.assetLink`, set `target.meow = data.meow` and `target.bhaw = data.bhaw`.
   - Remove proxying logic for `assetLink`.

4. **Add decoding in candidateService.js getCandidateData**
   - If `meow` and `bhaw` look encrypted (e.g., base64-like), decode them using stored mappings.
   - Use decoded originals for the actual fetch.

5. **Update /candidate endpoint if needed**
   - Ensure it also handles encoded meow/bhaw.

6. **Test the changes**
   - Call `/prs` endpoint, verify encrypted meow/bhaw returned.
   - Call with encoded meow/bhaw, verify decoding works.
   - Ensure images still proxied.

## Files to Edit
- services/candidateService.js
- routes/api.js
- Possibly add utils/encryption.js if needed

## Followup
- Move encryption key to environment variables.
- Add cleanup for old mappings.
- Verify no breaking changes.
