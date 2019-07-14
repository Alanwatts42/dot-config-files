#!/bin/bash

cp ~/.vimrc ~/vimrc/.vimrc
cp ~/.bash_aliases ~/vimrc/.bash_aliases
cp ~/.bashrc ~/vimrc/.bashrc
cp ~/.gitconfig ~/vimrc/.gitconfig
cp -R ~/.config ~/.config
cp -R ~/.emulationstation ~/vimrc/.emulationstation

echo "files copied to vimrc for backup"

cd ~/vimrc
git add *
git commit -m 'automated backup'
git push  



