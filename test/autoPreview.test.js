import assert from 'node:assert/strict';
import {
  buildAutoPreviewUrl,
  createAutoPreviewFile,
  getAutoPreviewFileUrl,
} from '../src/utils/autoPreview.js';

const fileUrl = 'file:///Users/smzdm/Documents/demo large.md';
const viewerUrl = buildAutoPreviewUrl(fileUrl);

assert.equal(
  viewerUrl,
  'viewer.html?auto=true&file=file%3A%2F%2F%2FUsers%2Fsmzdm%2FDocuments%2Fdemo%20large.md'
);
assert.equal(getAutoPreviewFileUrl('?auto=true&file=' + encodeURIComponent(fileUrl)), fileUrl);

const content = '# Large document\n\n' + 'x'.repeat(1024);
const file = createAutoPreviewFile(fileUrl, content, 123);

assert.deepEqual(file, {
  id: 123,
  name: 'demo large.md',
  content,
  lastModified: 123,
  url: fileUrl,
  isAutoPreview: true,
});

console.log('auto preview tests passed');
