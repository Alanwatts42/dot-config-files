set nocompatible
filetype plugin on 
syntax on

if has("win32")
  set rtp+=$HOME/vimfiles/bundle/Vundle.vim/
  call vundle#begin('$USERPROFILE/vimfiles/bundle/')
else
  set rtp+=~/.vim/bundle/Vundle.vim/
  call vundle#rc()
endif

"set rtp+=~/.vim/bundle/Vundle.vim/ call vundle#rc()
" set the runtime path to include vundle and initialize
"call vundle#begin()
" alternatively, pass a path where vundle should install plugins
" i.e. call vundle#begin('~/some/path/here')
"

" let vundle manage vundle, required
Plugin 'VundleVim/Vundle.vim'

" --Plugins--
"

" General Formatting
Plugin 'gabrielelana/vim-markdown'
Plugin 'vimwiki/vimwiki'

" Python
Plugin 'w0rp/ale'
Plugin 'vim-airline/vim-airline'
Plugin 'vim-airline/vim-airline-themes'
Plugin 'vim-syntastic/syntastic'
Plugin 'wellle/targets.vim'

" Python
Plugin 'davidhalter/jedi-vim'
Plugin 'sentientmachine/Pretty-Vim-Python'
Plugin 'klen/rope-vim'
Plugin 'vim-scripts/indentpython.vim'

" General IDE
Plugin 'tmhedberg/SimpylFold'
Plugin 'michaeljsmith/vim-indent-object'
Plugin 'FooSoft/vim-argwrap'
Plugin 'Valloric/YouCompleteMe'
Plugin 'tomtom/tcomment_vim'
Plugin 'tpope/vim-repeat'
Plugin 'tpope/vim-surround'
Plugin 'tpope/vim-commentary'
Plugin 'vim-scripts/pylint.vim'
Plugin 'thaerkh/vim-workspace'


" Github
Plugin 'tpope/vim-fugitive'
Plugin 'tpope/vim-rhubarb'


" Javascript
Plugin 'pangloss/vim-javascript'
Plugin 'mxw/vim-jsx'
Plugin 'leshill/vim-json'

" Color schemes
Plugin 'reedes/vim-thematic'    " Manage Vim’s appearance
"Plugin 'fcpg/vim-orbital'


call vundle#end()		" required
filetype plugin indent on	" required
" To ignore plugin indent changes, instead use:
" filetype plugin on
"
" --Look & Feel--
colorscheme darkblue
"set background=dark
"set guifont="Hack 10"
"set guifont=Hack\ 10
" --Colorscheme--
"  Just type 'colorscheme' followed by name of colorscheme
"  http://vimcolors.com
"  None selected currently
"
"
" --Plugin Configuration--
"
"  :PluginList			- lists configured plugins
"  :PluginInstall		- installs plugins
"  :PluginSearch foo		- searches for foo
"  :PluginClean			- confirms removal of unused plugins;
"


" -Vim-Rope-
map <leader>j :RopeGotoDefinition<CR>
map <leader>r :RopeRename<CR>

" -Vim Airline-
" Vim-airline theme selector 
let g:airline_theme='lucius'


" Align line-wise comment delimiters flush left instead of following code
" indentation
let g:NERDDefaultAlign = 'left'




" -NERDTree-
" Run NERDTree automatically when Vim opens up a directory (folder)
"autocmd StdinReadPre * let s:std_in=1
"autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists("s:std_in") | exe 'NERDTree' argv()[0]

" Map open NERDTree to ctrl+n
map <C-n> :NERDTreeToggle<CR>

" Close vim if the only window left open is a NERDTree
"autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTree") && b:NERDTree.isTabTree()) | q | endif


" ---Formatting/Key-Remaps---

" utf-8 encoding
set encoding=utf-8

" Set <leader> key to ','
let mapleader = ","

" normal clipboard
set clipboard=unnamed

" Stop annoying noises
set noerrorbells

" Makes Vim run a bit faster (in theory)
set lazyredraw

" Turn off buffer activity for file save/resume 
set nobackup
set noswapfile

" Smarter <Tab> behavior
set smarttab

" Shift+tab = <<
nmap <S-Tab> <<
imap <S-Tab> <Esc><<i

" Ignore case for searches (smart = excludes regex)
set ignorecase
set smartcase

" Highlight what you're searching for
set hlsearch

" Searches as you type
set incsearch


"  Quickly select the text that was just pasted
noremap gV '[v']

" Stay in visual mode when indenting
vnoremap < <gv
vnoremap > >gv

" Assign Y to select remainder of te current line
" and copy to clipboard
noremap Y y$

" In command mode (i.e. after pressing ':') 
" Allows %% to represent path of current dir
inoremap <C-e> <C-o>$

" Replace selected word and all of it's occurrences
nnoremap <Leader>rc :%s/\<<C-r><C-w>\>/
vnoremap <Leader>rc y:$s/<C-r>"/


" ---Python-IDE---
" *Necessary to make Vim act like a Python IDE*
"
" Python PEP 8 formatting
au BufNewFile,BufRead *.py
 set tabstop=4
 set softtabstop=4
 set shiftwidth=4
 set textwidth=80
 set wrap
 set expandtab
 set autoindent

" -Python code highlighting-
let python_highlight_all=1
syntax on

" Line numbering
set number

" Auto-complete for brackets () [] {}
set showmatch

" Execute Python code in current file with <F9>
autocmd Filetype python nnoremap <buffer> <F9> :exec '!python' shellescape(@%, 1)<cr>

" ---Javascript---

" Tab settings for .js, .html, .css
au BufNewFile,BufRead *.js, *.html, *.css
 set tabstop=2
 set softtabstop=2
 set shiftwidth=2

