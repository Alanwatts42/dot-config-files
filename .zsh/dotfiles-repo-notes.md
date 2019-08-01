# .zsh repository notes

<br>

## sub-modules
-------

<br>

### `oh-my-zsh`
--- | ---
repository | oh-my-zsh
url | `https://github.com/robbyrussell/oh-my-zsh.git`
filepath | `/home/evan/vimrc/.zsh/.oh-my-zsh/`

<br>

### `zplug`
--- | ---
repository | oh-my-zsh
url | `https://github.com/zplug/zplug.git`
filepath | `/home/evan/vimrc/.zsh/.zplug/`

<br>

----

<br>

## useful commands for repository management
-----

<br>

### `cd foobar_directory`

these commands only work from within the 
directory of the desired repository, so 
the first step is to change directory 
into that repository.

for sub-repositories (repos within repos)
the commands will only effect the 
repository for the directory you are in, 
even if that directory is within another 
repository. In order to affect the 
larger repository, you would need to 
navigate up to that larger directory 
with `cd ..` 

<br>

### get repo url
```git config --get remote.origin.url```
```git remote show origin```

<br>

### throw out local changes - revert to upstream content
```git reset```

<br>


