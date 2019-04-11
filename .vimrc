""" Evan's .vimrc
"""
""" The following is cobbled together from several other .vimrc
""" examples. No one comes up with anything independently.
""" Every 'new' idea is really a composite of various others.
""" Creativity is the ability to make the compositing process
""" invisible, or at the very least difficult to trace.

""" Anyone is welcome to steal anything you want that you can
""" you can find up here. If I didn't want it stolen, I
""" shouldn't have put it up here where everyone could see it.

""" Take what you want, give nothing back. Happy pirating lads.

set nocompatible
filetype plugin on 
syntax on

" Installs vim-plug on first time opening vim with this .vimrc.
" Also re-installs vim-plug if missing for whatever reason.
if empty(glob('~/.vim/autoload/plug.vim'))
    let g:clone_details = 'https://github.com/junegunn/vim-plug.git $HOME/.vim/bundle/vim-plug'
    silent call system('git clone --depth 1 '. g:clone_details)
    if v:shell_error | silent call system('git clone ' . g:clone_details) | endif
    silent !ln -s $HOME/.vim/bundle/vim-plug/plug.vim $HOME/.vim/autoload/plug.vim
    augroup FirstPlugInstall
        autocmd! VimEnter * PlugInstall --sync | source $MYVIMRC
    augroup END
endif

""" ===Plugins===

""" Formula to add a plugin = Plug 'reponame' (in single quotes)

""" :PlugInstall - Install the damn things
""" :PlugInstall! - Sometimes you have to yell
""" :PlugUpdate - Expand or die
""" :PlugClean - You don't wanna start getting mold in there

" Points to the dir where plugins managed by the plugin handler are kept.
" By default should be $HOME/.vim/bundle

call plug#begin('~/.vim/bundle')

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
Plug 'jalvesaq/vimcmdline'  " run code on external terminal


""" ==General Functionality==
Plug 'ctrlpvim/ctrlp.vim'  " Fuzzy finder (files, mru, etc)
Plug 'mbbill/undotree' " Undo history tool

""" ==Look & Feel==
Plug 'flazz/vim-colorschemes' " change colorshemes easier
Plug 'vim-airline/vim-airline' " operative word 'line'
Plug 'vim-airline/vim-airline-themes'  " Enables themes for vim-airline
" Colorscheme Repo
Plug 'rafi/awesome-vim-colorschemes'

""" ==Git and Version Control==
Plug 'tpope/vim-fugitive' " Git wrapper - control git with vim commands i.e. :Gcommit = git commit
Plug 'tpope/vim-rhubarb' " front-end for :Gbrowse - specifically github
Plug 'junegunn/gv.vim' " diff tool - requires vim-fugitive to run
Plug 'sodapopcan/vim-twiggy' " branch manager for git repositories
Plug 'airblade/vim-gitgutter'  " diff tool - shows changes made to file being edited (as long as it's part of a git repo)
Plug 'christoomey/vim-conflicted' " tool for merge & rebase conflicts

""" ==Atypical Filetype Handling==
Plug 'plasticboy/vim-markdown' " Markdown handling in Vim 
Plug 'godlygeek/tabular' " Req'd for vim-markdown

call plug#end()


""" ==Colorscheme==
" main colorscheme
colorscheme meta5

" vim-airline theme
let g:airline_theme='lucius'

" ==Useful General Settings==

" Settings that will apply to all filetypes. Any filetype-specific
" configurations (*.vim files inside the .vim/ftplugin directory)
" would have these settings as a foundation, and there shouldn't be
" many filetypes (if any) that require any of these to be turned off

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
noremap <Leader>y "+y
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
set gdefault                " default s//g (global)
set incsearch               " searches as you type
set matchtime=2             " time to blink match {}
set matchpairs+=<:>         " for ci< or ci>
set showmatch               " tmpjump to match-bracket
" Find and replace all
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/

" Toggle relativenumber
nnoremap <Leader>r :set relativenumber!<CR>

" --Screen-Splitting--
" :sp <path to file you want to split screen with (vertically)

" I forgot how to do it horizontally but it'd be identical to
" the way you do it vertically, but with something other than :sp

" Split Direction
set splitbelow                  " splits go below w/focus
set splitright                  " vsplits go right w/focus

" Split Navigation - Moving between splits (windows)
map <c-j> <c-w>j
map <c-k> <c-w>k
map <c-l> <c-w>l
map <c-h> <c-w>h

"" -Indent, Type-Setting Options-

" Misc lines and splits
set laststatus=2                " always show statusline
set linebreak                   " don't cut words on wrap
set listchars=tab:>\            " > to highlight <Tab>
set list                        " displaying listchars
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

" -Rope-Vim-Keys-
"__Default keys for vim-rope commands prior to any re-binding__
"
" Uses almost the same keybinding as ropemacs.  Note that global
" commands have a ``C-x p`` prefix and local commands have a 
" ``C-c r`` prefix.  You can change that (see variables_ section).
" ================  ============================
" Key               Command
" ================  ============================
" C-x p o           RopeOpenProject
" C-x p k           RopeCloseProject
" C-x p f           RopeFindFile
" C-x p 4 f         RopeFindFileOtherWindow
" C-x p u           RopeUndo
" C-x p r           RopeRedo
" C-x p c           RopeProjectConfig

"
" C-c r r           RopeRename
" C-c r l           RopeExtractVariable
" C-c r m           RopeExtractMethod
" C-c r i           RopeInline
" C-c r v           RopeMove
" C-c r x           RopeRestructure
" C-c r u           RopeUseFunction
" C-c r f           RopeIntroduceFactory
" C-c r s           RopeChangeSignature
" C-c r 1 r         RopeRenameCurrentModule
" C-c r 1 v         RopeMoveCurrentModule
" C-c r 1 p         RopeModuleToPackage
"
" C-c r o           RopeOrganizeImports
" C-c r n [vfcmp]   RopeGenerate(Variable|Function|Class|Module|Package)
"
" C-c r a /         RopeCodeAssist
" C-c r a g         RopeGotoDefinition
" C-c r a d         RopeShowDoc
" C-c r a f         RopeFindOccurrences
" C-c r a ?         RopeLuckyAssist
" C-c r a j         RopeJumpToGlobal
" C-c r a c         RopeShowCalltip
"                   RopeAnalyzeModule
"
"                   RopeAutoImport
"                   RopeGenerateAutoimportCache
" ===============   ============================
"
"
" Shortcuts
" ---------
"
" Some commands are used very frequently; specially the commands in
" code-assist group.  You can define your own shortcuts like this::
"
"   :map <C-c>g :call RopeGotoDefinition()
"
" Ropevim itself comes with a few shortcuts.  These shortcuts will be
" used only when ``ropevim_enable_shortcuts`` is set.
"
" ================  ============================
" Key               Command
" ================  ============================
" M-/               RopeCodeAssist
" M-?               RopeLuckyAssist
" C-c g             RopeGotoDefinition
" C-c d             RopeShowDoc
" C-c f             RopeFindOccurrences
" ================  ============================
