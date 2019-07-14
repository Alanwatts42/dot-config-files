#!/bin/bash

cp ~/.vimrc ~/vimrc/.vimrc
cp ~/.bash_aliases ~/vimrc/.bash_aliases
cp ~/.bashrc ~/vimrc/.bashrc
cp ~/.gitconfig ~/vimrc/.gitconfig
cp -R ~/.config ~/.config
cp -R ~/.emulationstation ~/vimrc/.emulationstation
cp ~/sync.sh ~/vimrc/sync.sh

echo "files copied to vimrc for backup"

cd ~/vimrc
git add --all
git commit -m 'automated backup'
git push  

echo "sync completed...  all your files are belong to...  well, you I suppose. Whatever, the point is that it's done, what more do you want from me?"
