# StarUML extension to generate PeeWee database models


## Purpose

The aim of this project is to provide an StarUML extension to:

- Auto-generate **PeeWee Model Classes** from an Entity Relationship Diagram (ERD).



## Installation

1. Install **StarUML**,  [download page](http://staruml.io/download).
2. Download or clone this repo.
3. Copy repo files to StarUML extension user folder:
  - MacOS: `~/Library/Application Support/StarUML/extensions/user/staruml-peewee`
  - Windows: `C:\Users\<user>\AppData\Roaming\StarUML\extensions\user\staruml-peewee`
  - Linux: `~/.config/StarUML/extensions/user/staruml-peewee`



## Usage

First create a ERD defining the database layout in StarUML. Then run this
extension to translate that to a Python PeeWee Model corresponding to
the same database schema which you have defined. Specifically,

1. Click the menu (`Tools > PeeWee Database Model > Generate Code...`)
2. If necessary, select a base model (or package) that will be generated to PeeWee database model.
3. Select a folder where generated Python source file (.py) will be placed.



## Sample

```python

# ... include example code here ...

```

## Disclaimer

This project is provided as-is, with no implied warranty of any
kind. This is very much a work-in-progress. Feel free to report any
bugs that you find here via github.


## Contributors

- Charles Hill [nopaniers@gmail.com](nopaniers@gmail.com)

This project is based on a similar project, [staruml-django](https://github.com/josemlp91/staruml-django), by [josemlp91](https://github.com/josemlp91).


If you find this project useful, feel free to buy me a coffee.

