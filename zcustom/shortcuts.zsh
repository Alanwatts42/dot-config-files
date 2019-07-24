# ==Example==
# Purpose of the 'custom' directories, and utility and usage of any '*.zsh' files added to them.
# You can put files here to add functionality separated per file, which
# will be ignored by git.
# Files on the custom/ directory will be automatically loaded by the init
# script, in alphabetical order.

# For example: add yourself some shortcuts to projects you often work on.
# 
# brainstormr=~/Projects/development/planetargon/brainstormr
# cd $brainstormr
#
# The above text used to be in a seperate file called 'example.zsh'. 
# I chose to copy and paste it here so I could remove the superflous 'example.zsh' file.
#
# It is important to note that this file will be run upon zsh startup
# Therefore, any commands included in this file or any other '*.zsh'
# files in the 'custom' directories will be executed in order from
# top to bottom as zsh is "booting up". This is potentially useful,
# and expands the utility of these files beyond just shortcuts.
#
# ==Shortcuts== 
#
# Allow `cd %s` to access commonly used directories without the need
# to type the whole path for any directories that have a shortcut.
#
# --projects--

projects=~/_projects/
# command: `cd $projects`

scraper=~/_projects/scraper/scraper/
# command: `cd $scraper`

autofire=~/_projects/autofire-0.01a/
# command: `cd $autofire`


# --config-files--

zcustom=~/.oh-my-zsh/custom/
# command: `cd $zcustom`

zplugins=~/.oh-my-zsh/custom/plugins/
# command: `cd $zplugins`


# --roms--

roms=~/RetroPie/roms/
# command: `cd $roms`

snes=~/RetroPie/roms/snes/
# command: `cd $snes`

megadrive=~/RetroPie/roms/megadrive/
# command: `cd $megadrive`

pcengine=~/RetroPie/roms/pcengine/
# command: `cd $pcengine`


# --main--

docs=~/Documents/
# command: `cd $docs`

dls=~/Downloads/
# command: `cd $dls`


