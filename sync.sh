#!/bin/zsh -e

# switch to $HOME
cd $HOME

# dotfiles
cp $HOME/.vimrc $HOME/vimrc/.vimrc
cp $HOME/.aliases $HOME/vimrc/.aliases
cp $HOME/.bashrc $HOME/vimrc/.bashrc
cp $HOME/.zshrc $HOME/vimrc/.zshrc
cp $HOME/.gitconfig $HOME/vimrc/.gitconfig

# script(s)
cp $HOME/sync.sh $HOME/vimrc/sync.sh
cp $HOME/shinstall.sh $HOME/vimrc/shinstall.sh

# backup complete
echo "files copied to vimrc for backup"

# starting git commit & push
cd $HOME/vimrc
commit_message="$1" # commit message is $1 first standard input
git add --all
echo "files added"
git commit -m "$commit_message"
echo "pushing files to remote..."
git push  

echo "sync completed...  all your files are belong to...  well, you I suppose. Whatever, the point is that it's done, what more do you want from me?"
