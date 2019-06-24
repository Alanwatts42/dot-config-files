# Evan's Vim Config and Attempt to Explain Himself

<br>

Evan Sherwood -- evan.sherwood@keemail.me
github -- https://github.com/Alanwatts42/vimrc

<br>

Hello, whooever you are. You've stumbled onto my vimrc repository. This will show my 
configuration for Vim 8 or `vim-nox` per the ubuntu synaptic package manager. The bulk of 
the modifications I made are centered around giving Vim almost all of the typical
features of a Python IDE, as well as a few that actually exceed what I've been able to achieve with IDEs such aS easy access to documentation using your cursor and a keyboard shortcut to lookup documentation about any code that you can find with your cursor. This saves a lot of time and useless repetitive copy+paste to and from a web browser or perhaps a search bar connected to an offline wiki or something. In any case, Vim is awesome, vimcredible, and best of all, customizable. Thank you, noble user, for following the instructions implied in the title of this document. May the force be with you, and may the hair on your toes never fall out.

The primary features that this my .vimrc adds to Vim are:



# Vundle

1. Vundle is a system for managing plugins. It searches and downloads new
   plugins automatically as they are listed in the .vimrc file. Despite
   the fact that I now use vim-plug, I think it's more appropriate that
   the idea for such a tool be attributed to the guy who created Vundle.
   I don't know who came up with the concept first, but I do know that
   Vundle has been around longer than any of the other similar ones I've
   come accross. The only reason I use vim-plug is that it's slightly
   more lean code-wise, but it's effectively the exact same things as
   Vundle, they all are.
<a href="https://github.com/VundleVim/Vundle.vim">https://github.com/VundleVim/Vundle.vim</a>.

<br>

## Related vim-script:

 - Though not necessary to use vim-plug, I set up an if statement that will
check to see whether or not vim-plug is currently installed and obviously
install it if it finds it's not.
 - I wanted this to work with windows as well as linux (ubuntu specifically but 
it should work on most if not all distros). This is admittedly a crude
solution, but it works on both Windows and Linux. Not sure about Mac, but 
if you have a Mac, I'd appreciate any feedback or git mechanism you want to
throw at me.
```

" Allows the same .vimrc file to be used on both Windows and Linux (WSL) " defines variable called home, varies based on OS directory system if has("win32")
  let dotvim = 'C:\Users\evan\vimfiles\'
else
  let dotvim = "/home/evan/.vim/"
endif
 
let bundle = dotvim."bundle"
let autoload = dotvim."autoload"

" Install vim-plug on first time opening vim with this .vimrc.
" Also re-installs vim-plug if missing for whatever reason.
if has("win32")
	if empty(autoload)
		md \vimfiles\autoload
		$uri = 'https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'
		(New-Object Net.WebClient).DownloadFile(
			$uri,
			$ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath(	"~\vimfiles\autoload\plug.vim"
			)
		)
	endif
else
  if empty(autoload)
    silent !curl -fLo plug --create-dirs \ https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
    autocmd VimEnter * PlugInstall --sync | source $MYVIMRC
  endif
endif

""" ===Plugins===

""" Formula to add a plugin = Plug 'foo/bar' (in single quotes)

""" :PlugInstall - Install the damn things
""" :PlugInstall! - Sometimes you have to yell
""" :PlugUpdate - Expand or die
""" :PlugClean - You don't wanna start getting mold in there

" Points to the dir where plugins managed by the plugin handler are kept.
" By default should be $HOME/.vim/bundle

call plug#begin(bundle)
```
 - Strictly speaking, the only necessary bit of code to make vim-plug 
function is the `call plug#begin(bundle)`. That said, it will only work 
if the vim-plug repo has been cloned into a specified directory (bundle in 
thiscase as you might have noticed). However, I find it useful to leave 
comments
that show a copy of the basic commands for vim-plug in case of a moment of 
amnesia.

 - All plugins must be included between: 
````
call plug#begin(bundle)

Plug 'repo/name'
Plug 'tpope/vim-fugitive' " note repo url is https://github.com/tpope/vim-fugitive

call plug#end() 
````
 - Each plugin is added simply by being in between these two statements, and
being formatted correctly. For vim-plug, the format is `Plug` followed by 
the repository name as it appears at the end of it's url i.e. 
`tpope/vim-fugitive` (typically `author/title` is what you see).

 - If formatted correctly, and if everything else is working as designed, 
you may use `:PlugInstall` at any time to automatically install 
(or reinstall) all plugins you've listed. Other commands are listed as well, 
the other major one being `PlugUpdate`, try and guess what that does.

# Vim-Fugitive

Vim-fugitive is a wrapper for Git that's build into Vim. It was not tpope who killed 
his wife, it was the one-armed man. Don't let him git away lol. 
<a href="https://github.com/tpope/vim-fugitive">https://github.com/tpope/vim-fugitive</a>

<br>

# Sparkup

Sparkup is a plugin for writing HTML. Lets you compose long blocks of HTML 
using a kind of short-hand for HTML which automatically expands into 
full-length HTML. It's honestly something I haven't used very much, but it's
an interesting concept, and potentially very useful if you happen to do a 
lot of work with  HTML.

# NERDTree

A file explorer plugin that allows you to easily interact with files from within vim, 
without having to quit and use the command line, or worse, the GUI of your OS. True elite 
hacker dudes never use a GUI, and this plugin will finally let you run with the cool kids 
even if you haven't set up permanent residence within the monochrome glow of the
terminal. Basically, it's a terminal file explorer that's tied into vim, making it easier
to do what you need to do, and honestly it's not half bad. NERDTree Tabs is exactly what 
it says on the tin, a tabs plugin for Vim. Basically, just lets you open multiple tabs,
whether they are documents, or multiple directories open in NERDTree, either way works.

<a href="https://github.com/jistr/vim-nerdtree-tabs">jistr/vim-nerdtree-tabs</a>

<br>
<br>

# Comprehensive List of All of my Current Plugins

Let's just say I wanted to make it easier on you guys, but the truth is I got lazy. Here 
are all of them, and if I were to describe them in as much detail as I did the first few, 
I'd probably have a 120 page long readme document. Nobody should have to read that, not 
even me.

<br>


## Version Control

vim-fugitive | tpope | git wrapper
--- | --- | ---
vim-rhubarb | tpope | 
gv.vim | junegunn | diff extension to vim-fugitive
*vim-gitgutter | airblade | diff tool showing changes along the margins
vim-twiggy | sodapopcan | brach manager for git repositories
vim-conflicted | christoomy | git rebase tool for merge conflicts

<br>

## Coding & Development Tools

vim-virtualenv | plytophogy | python virtualenv integration for vim
--- | --- | ---
vim-pipenv | pieterjanmontens | python pipenv integration for vim
vim-syntastic | syntastic | A syntax highlighter for a variety of languages
rope-vim | klen | Use [leader]+j to pull up documentation for your code
vim-surround | tpope | easy manipulation of surround characters i.e. ()[] etc.
*tcomment_vim | tomtom | use gcc to comment/uncomment text under cursor
vim-commentary | tpope | tpope doesn't write docs, they  write themselves out of 
fear.
vim-autoclose | somini | auto-close when using grouping symbols i.e.'(), [], {}, 
'', '
vim-eunuch | tpope | UNIX shell command helpers, e.g. sudo, chmod, remove etc.
vim-argwrap | FooSoft | rearrange args within () using [leader]+a
vimcmdline | jalvesaq | run code that you are working on in vim on external terminal window
YouCompleteMe | Valloric | adds extensive code completion for multiple languages

<br>

## Misc. Utilities

ctrlp.vim | ctrlpvim | Adds fuzzy search functionality to find files, mru, etc
undotree | mbbill | Enables extensive historical undo feature for vim
vim-airline | vim-airline | customizable line showing useful info in vim - one of 
my favorites
*vim-airline | vim-airline-themes | adds the ability to change vim-airline theme
vim-markdown | plasticboy | markdown support for vim
tabular | godlygeek | required to run vim-markdown

<br>

## Look & Feel

*vim-colorschemes | flazz | enables easier method to change vim colorscheme
awesome-vim-colorschemes | afi | a repo with many curated  colorschemes
meta5 | christophermca | my current colorscheme - note: vim-plug (or other tool 
similar to vundle) will download and "install" colorschemes as long as they are
available as a git repository
