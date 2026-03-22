"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addVersion = addVersion;
exports.getVersions = getVersions;
const versions = [];
function addVersion(version) {
    versions.push(version);
}
function getVersions(documentId) {
    return versions.filter((version) => version.documentId === documentId);
}
