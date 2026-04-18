## 1.7.0

###### _Nov 21, 2025_

- loader: merged #61 - add backward compatibility for 0.53 and 0.54 versions
- monaco-editor: update to the latest version (0.55.1)

## 1.6.1

###### _Oct 14, 2025_

- eslint: use mjs for eslint config file
- package: remove type field

## 1.6.0

###### _Oct 12, 2025_

- monaco-editor: update to the latest version (0.54.0)
- package: update all dependencies to the latest version
- playground: update all dependencies to the latest version

## 1.5.0

###### _Feb 13, 2025_

- monaco-editor: update to the latest version (0.52.2)
- package: remove monaco-editor from peerDependencies

## 1.4.0

###### _Oct 1, 2023_

- monaco-editor: update to the latest version (0.43.0)

## 1.3.3

###### _Apr 2, 2023_

- monaco-editor: update to the latest version (0.36.1)

## 1.3.2

###### _May 11, 2022_

- utility: resolve monaco instance in case of provided monaco instance and global availability

## 1.3.1

###### _Apr 23, 2022_

- utility: implement isInitialized flag

## 1.3.0

###### _Mar 20, 2022_

- types: add optional monaco type into config params
- utility: implement optional monaco param for config
- test: fix a test case according to the new changes
- playground: create a playground for testing the library
- monaco-editor: update to the latest version (0.33.0)

## 1.2.0

###### _Oct 3, 2021_

- monaco-editor: update to the latest version (0.28.1)
- types: fix CancelablePromise type

## 1.1.1

###### _Jun 21, 2021_

- monaco-editor: update to the latest version (0.25.2)

## 1.1.0

###### _Jun 12, 2021_

- monaco-editor: update to the latest version (0.25.0)

## 1.0.1

###### _Mar 18, 2021_

- monaco-editor: update to the latest version (0.23.0)

## 1.0.0

###### _Jan 15, 2021_

🎉 First stable release

- utility: rename the main utility: monaco -> loader
- helpers: create (+ named export) `__getMonacoInstance` internal helper

## 0.1.3

###### _Jan 8, 2021_

- build: in `cjs` and `es` bundles `state-local` is marked as externam lib
- build: in `cjs` and `es` modules structure is preserved - `output.preserveModules = true`

## 0.1.2

###### _Jan 7, 2021_

- package: add jsdelivr source path

## 0.1.1

###### _Jan 7, 2021_

- lib: rename scripts name (from 'core' to 'loader')

## 0.1.0

###### _Jan 6, 2021_

🎉 First release
