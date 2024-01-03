
# StartUML extension to auto generate PeeWee database bindings


## Planned Features

- Auto-generate **PeeWee Model Class**.


## Requirements

First create a ERD defining the database layout. Then run this extension to translate that to a Python PeeWee Model correxponding to the same database schema.




## Installation

1- Install **StarUML**,  [download page](http://staruml.io/download).

2- Download or clone this repo.

3- Copy repo files to StarUML extension user folder.

-	MacOS: `~/Library/Application Support/StarUML/extensions/user/staruml-peewee`
- Windows: `C:\Users\<user>\AppData\Roaming\StarUML\extensions\user\staruml-peewee`
- Linux: `~/.config/StarUML/extensions/user/staruml-peewee`



## Usage

1. Click the menu (`Tools > PeeWee Models > Generate Code...`)
2. Select a base model (or package) that will be generated to PeeWee Models.
3. Select a folder where generated Python source files (.py) will be placed.


## Sample

```python

# ... include example code here ...

```

## Disclainer

This project only just beginning, and not suitable for production yet.

## Contributors

- Charles Hill [quantumcharleshill@gmail.com](quantumcharleshill@gmail.com)
