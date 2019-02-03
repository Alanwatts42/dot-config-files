set nocompatible              " be iMproved, required
filetype off                  " required

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()
" alternatively, pass a path where Vundle should install plugins
"call vundle#begin('~/some/path/here')

" let Vundle manage Vundle, required
Plugin 'VundleVim/Vundle.vim'

" The following are examples of different formats supported.
" Keep Plugin commands between vundle#begin/end.
" plugin on GitHub repo
Plugin 'tpope/vim-fugitive'
" plugin from http:
//vim-scripts.org/vim/scripts.html
" Plugin 'L9'
" Git plugin not hosted on GitHub
" Plugin 'git://git.wincent.com/command-t.git'
" git repos on your local machine (i.e. when working on your own plugin)
" Plugin 'file:///home/gmarik/path/to/plugin'
" The sparkup vim script is in a subdirectory of this repo called vim.
" Pass the path to set the runtimepath properly.
Plugin 'rstacruz/sparkup', {'rtp': 'vim/'}
" Install L9 and avoid a Naming conflict if you've already installed a
" different version somewhere else.
" Plugin 'ascenator/L9', {'name': 'newL9'}

" :sp <filename> for vertical split (top/bottom)
" :vs <filename> for horizontal split (left/right)
set splitbelow
set splitright

"split navigations
nnoremap <C-J> <C-W><C-J>
nnoremap <C-K> <C-W><C-K>
nnoremap <C-L> <C-W><C-L>
nnoremap <C-H> <C-W><C-H>

" Enable folding
set foldmethod=indent
set foldlevel=99

" Enable folding with the spacebar
nnoremap <space> za

" docstrings for folded code
let g:SimpylFold_docstring_preview=1


" PEP 8 indentation, Tab = 4 spaces
au BufNewFile,BufRead *.py
 set tabstop=4
 set softtabstop=4
 set shiftwidth=4
 set textwidth=79
 set expandtab
 set autoindent


" Python code highlighting
 let python_highlight_all=1
syntax on
 


" Tab settings for each filetype:
au BufNewFile,BufRead *.js, *.html, *.css
 set tabstop=2
 set softtabstop=2
 set shiftwidth=2


let g:ycm_autoclose_preview_window_after_completion=1
map <leader>g  :YcmCompleter GoToDefinitionElseDeclaration<CR>





" Clipboard access outside of Vim
set clipboard=unnamed


" Line numbers
set number


" Setting utf-8 encoding, duh
set encoding=utf-8


" Adds in the ability to hit <F9> to execute Python code
:autocmd FileType python :nmap <F9> :! clear <CR> :! python % <Enter>



" Plugins - :PluginInstall in Vim for Vundle to install plugins listed here

Plugin 'tmhedberg/SimpylFold'	" https://github.com/tmhedberg/SimpylFold.git
Plugin 'vim-scripts/indentpython.vim'	
" https://github.com/vim-scripts/indentpython.vim.git
Plugin 'nvie/vim-flake8'	" https://github.com/nvie/vim-flake8.git
Plugin 'scrooloose/nerdtree' 	" https://github.com/scrooloose/nerdtree.git
Plugin 'jistr/vim-nerdtree-tabs'
" https://github.com/jistr/vim-nerdtree-tabs.git
Plugin 'tpope/vim-fugitive'		" https://github.com/tpope/vim-fugitive.git
Plugin 'tpope/vim-repeat'		" https://github.com/tpope/vim-repeat.git
Plugin 'tpope/vim-surround' 	" https://tpope.io/vim/surround.git
Plugin 'tpope/vim-commentary'	" https://tpope.io/vim/commentary.git
Plugin 'davidhalter/jedi-vim'	" http://github.com/davidhalter/jedi-vim



" All of your Plugins must be added before the following line
call vundle#end()            " required
filetype plugin indent on    " required
" To ignore plugin indent changes, instead use:
filetype plugin on
"
" Brief help
" :PluginList       - lists configured plugins
" :PluginInstall    - installs plugins; append `!` to update or just :PluginUpdate
" :PluginSearch foo - searches for foo; append `!` to refresh local cache
" :PluginClean      - confirms removal of unused plugins; append `!` to auto-approve removal
"
" see :h vundle for more details or wiki for FAQ
" Put your non-Plugin stuff after this line