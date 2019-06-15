""" Evan's .vimrc
set nocompatible
augroup myvimrc
    au!
    au BufWritePost .vimrc,_vimrc,vimrc,.gvimrc,_gvimrc,gvimrc so $MYVIMRC| if has('gui_running') | so $MYGVIMRC | endif
augroup END

" Allows the same .vimrc file to be used on both Windows and Linux (WSL)
" defines variable called home, varies based on OS directory system
if has("win32")
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

" ==Pipenv/Virtualenv Integration==
Plug 'plytophogy/vim-virtualenv'    " required for vim-pipenv
Plug 'PieterjanMontens/vim-pipenv'  " integrates vim/pipenv

""" ==Development Environment and Enhancements==
Plug 'vim-syntastic/syntastic' " A linter, many options, much correct.
Plug 'klen/rope-vim' " Use <leader>+j for docs lookup on selected code
Plug 'tpope/vim-surround'  " easy manipulation of surround chars
Plug 'tomtom/tcomment_vim' " use gcc to comment/uncomment text under cursor
Plug 'tpope/vim-commentary'  " tpope doesn't write docs, docs write themselves out of fear.
" Auto-close when using grouping symbols i.e.'(), [], {}, '', '
Plug 'somini/vim-autoclose'
" UNIX shell command helpers, e.g. sudo, chmod, remove etc.
Plug 'tpope/vim-eunuch'
Plug 'FooSoft/vim-argwrap'  " Rearrange args within () using <leader><a>
" Plug 'jalvesaq/vimcmdline'  " run code on external terminal
Plug 'Valloric/YouCompleteMe'


""" ==General Functionality==
Plug 'ctrlpvim/ctrlp.vim'  " Fuzzy finder (files, mru, etc)
Plug 'mbbill/undotree' " Undo history tool

""" ==Look & Feel==
Plug 'flazz/vim-colorschemes' " change colorshemes easier
Plug 'vim-airline/vim-airline' " operative word 'line'
Plug 'vim-airline/vim-airline-themes'  " Enables themes for vim-airline
Plug 'christophermca/meta5'  " meta5 colorscheme

" Colorscheme Repo
Plug 'rafi/awesome-vim-colorschemes'

""" ==Git and Version Control==
Plug 'tpope/vim-fugitive' " Git wrapper - control git with vim commands i.e. :Gcommit = git commit
Plug 'tpope/vim-rhubarb' " front  
Plug 'junegunn/gv.vim' " diff tool - requires vim-fugitive to run
Plug 'sodapopcan/vim-twiggy' " branch manager for git repositories
Plug 'airblade/vim-gitgutter'  " diff tool - shows changes made to file being edited (as long as it's part of a git repo)
Plug 'christoomey/vim-conflicted' " tool for merge & rebase conflicts

""" ==Atypical Filetype Handling==
Plug 'plasticboy/vim-markdown' " Markdown handling in Vim 
Plug 'godlygeek/tabular' " Req'd for vim-markdown

call plug#end() " automatically executes: 'filetype plugin indent on'  and 'syntax enable'

filetype on     " filetype plugins on
syntax on       " syntax highlighting on


""" ==Colorscheme==
" main colorscheme
colorscheme meta5

" vim-airline theme
let g:airline_theme='lucius'



" ==All-Purpose-Execute==
" date: 06/14/2019
" purpose: \map <F6> to: \write current buffer (save file) 
" \make file executable \Create temp file \execute \dump output to it \new tab
" \read file in new tab \delete temp file
" code:
nmap <F6> :w<CR>:silent !chmod 755 %<CR>:silent !./% > .tmp.xyz<CR>
     \ :tabnew<CR>:r .tmp.xyz<CR>:silent !rm .tmp.xyz<CR>:redraw!<CR>
" \\ ==end==

" -Pipenv-Integration-
let pipenv_venv_path = system('pipenv --venv')


" ==File-Type Settings==

" -Templates-
" Shell Scripts '*.sh' files
" Python files '*.py' files
if has("autocmd")
  augroup templates
    autocmd BufNewFile *.sh 0r ~/.vim/templates/skeleton.sh
    autocmd BufNewFile *.py 0r ~/.vim/templates/skeleton.py
  augroup END
endif


" ==Useful General Settings==

" Settings that will apply to all filetypes. Any filetype-specific
" configurations (*.vim files inside the .vim/ftplugin directory)
" would have these settings as a foundation, and there shouldn't be
" many filetypes (if any) that require any of these to be turned off


set title               " window title
set vb t_vb=            " disable beep and flashing
set showcmd             " show cmds being typed
set number  " IDE style line numbering
set sc  " Display incomplete commands
set matchtime=2             " time to blink match {}
set matchpairs+=<:>         " for ci< or ci>
set showmatch            " Auto-complete for brackets () [] {}
set wildignore+=*.bak,*.swp,*.swo
set wildignore+=*.a,*.o,*.so,*.pyc,*.class
set wildignore+=*.jpg,*.jpeg,*.gif,*.png,*.pdf
set wildignore+=*/.git*,*.tar,*.zip
set wildmenu
set wildmode=longest:full,list:full
set autoread                    " refresh if changed
set confirm                     " confirm changed files
set noautowrite                 " never autowrite
set nobackup                    " disable backups
set linebreak                   " don't cut words on wrap
set list                        " displaying listchars
set mouse=a                      " disable mouse



" Use utf-8 encoding
set encoding=utf-8
set number

" -Keyboard-Cartography-

" <leader> key mapping. I typically use comma or ','
let g:mapleader=','

" Quickly edit/source .vimrc
noremap <Leader>ve :edit $HOME/.vimrc<CR>
noremap <Leader>vs :source $HOME/.vimrc<CR>

""" -Clipboard-
" Fixing Vim's clipboard (as much as possible)
vnoremap <Leader>y "*y
noremap Y y$
nnoremap <F2> :set invpaste paste?<CR>
set pastetoggle=<F2>
set showmode
set clipboard=unnamed
" About clipboard modifications:
" <leader>y or 'leader+y' should copy to system clipboard
" <F2> toggles 'paste mode', helps paste into vim
" Procedure for this: <F2>, <insert mode>, <paste>, <F2> again for paste mode off.
" 'showmode' tells vim to display status of  'paste mode' (on or off)
" 'set clipboard=unnamed', not sure what this does exactly, but also helps fix vim's clipboard.

""" -Search Options-
set incsearch               " searches as you type
set matchtime=2             " time to blink match {}
set matchpairs+=<:>         " for ci< or ci>
set showmatch               " tmpjump to match-bracket

" %% = current working directory (useful in ':'  command mode)
inoremap <C-e> <C-o>$

" Find and replace all
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/

" Toggle relativenumber
nnoremap <Leader>rnn :set relativenumber!<CR>

" --Screen-Splitting--
" :sp <path to file you want to split screen with (vertically)
" i.e. :sp ~/.vimrc to split the screen with the .vimrc

" Split Direction
set splitbelow                  " splits go below w/focus
set splitright                  " vsplits go right w/focus

" Split Navigation - Moving between splits (windows)
map <c-j> <c-w>j
map <c-k> <c-w>k
map <c-l> <c-w>l
map <c-h> <c-w>h

"" -Indent, Type-Setting Options-

" <ctrl-e> jumps to the end of the line in insert mode
inoremap <C-e> <C-o>$

" Misc lines and splits
set laststatus=2                " always show statusline
set linebreak                   " don't cut words on wrap
set listchars=tab:>\            " > to highlight <Tab>
set nolist                        " displaying listchars
set ww=<,>,h,l  " ww = commands allowed to 'wrap' around EOL

" Sounds & Other Peripheral Functions
set noeb  " Attempt to silence error dings for console vim
set ttyfast                     " for faster redraws etc

" Easy indent with >> or << with in visual mode
vnoremap < <gv
vnoremap > >gv

" Highlight last inserted text
nnoremap gV '[V']

" Mouse/Cursor (or lack thereof)
set ru  " Show cursor position even if inactive
set lazyredraw  " Makes Vim run a bit faster (in theory)
set mouse=a  " Limited mouse functionality

"" Wildmode/wildmenu command-line completion
set wildignore+=*.bak,*.swp,*.swo
set wildignore+=*.a,*.o,*.so,*.pyc,*.class
set wildignore+=*.jpg,*.jpeg,*.gif,*.png,*.pdf
set wildignore+=*/.git*,*.tar,*.zip
set wildmenu
set wildmode=longest:full,list:full

" saving/loading
set autoread                    " refresh if changed
set confirm                     " confirm changed files
set noautowrite                 " never autowrite
set nobackup                    " disable backups

""" Persistent undo. Requires Vim 7.3 {{{
if has('persistent_undo') && exists('&undodir')
    set undodir=$HOME/.vim/undo/    " where to store undofiles
    set undofile                " enable undofile
    set undolevels=500          " max undos stored
    set undoreload=10000        " buffer stored undos
endif

" Undo History
set hidden                      " buffer change, more undo
set history=1000                " default 20

""" Text formatting 
set autoindent                  " preserve indentation
set backspace=indent,eol,start  " normal backspace
set expandtab                   " indents <Tab> as spaces
set ignorecase                  " by default ignore case
set nrformats+=alpha            " incr/decr letters C-a/-x
set shiftround                  " round indent of 'sw'
set shiftwidth=0                " =0 uses 'ts' value
set smarttab                    " tab to 0,4,8 etc.
set softtabstop=-1              " =-1 uses 'sw' value
set tabstop=4                   " <Tab> as 4 spaces

""" ==gvim options==
set guioptions-=m       " remove menubar
set guioptions-=T       " remove toolbar
set guioptions-=r       " remove right scrollbar

""" ===Plugin Settings & Reference===

" -Vim-Argwrap-
nnoremap <silent> <leader>a :ArgWrap<CR>  

"" -Syntastic-
noremap <silent><Leader>le :Errors<CR>  
noremap <silent><Leader>lc :lclose<CR>  

"" -Rope-Vim-
map <leader>j :RopeGotoDefinition<CR>
map <leader>r :RopeRename<CR>

"" -Undotree-
nnoremap <F5> :UndotreeToggle<CR>
" Toggle undotree plugin with <F5>

