#!/usr/bin/zsh

# Install pkg and suggests -f param mitigates dependency breaks
sudo apt-get -f install "$1" --install-suggests

