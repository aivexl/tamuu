<script setup lang="ts">
import { Sparkles, Instagram, Twitter, Facebook, Mail, Phone, MapPin } from 'lucide-vue-next';
</script>

<template>
  <footer class="bg-[#0A1128] pt-20 pb-10 px-6 border-t border-white/5">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 xl:gap-12 mb-16">
        <!-- Brand -->
        <div class="space-y-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-[#FFBF00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FFBF00]/20">
              <Sparkles class="w-7 h-7 text-[#0A1128]" />
            </div>
            <span class="text-3xl font-black text-white tracking-tighter">Tamuu</span>
          </div>
          <p class="text-slate-400 text-sm leading-relaxed font-medium">
            Platform undangan digital tercanggih di Indonesia. Menghadirkan kemewahan dan kemudahan dalam setiap momen berharga Anda.
          </p>
          <div class="flex items-center gap-4">
            <a href="#" class="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#FFBF00] hover:bg-white/10 transition-all duration-300 border border-white/5">
              <Instagram class="w-5 h-5" />
            </a>
            <a href="#" class="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#FFBF00] hover:bg-white/10 transition-all duration-300 border border-white/5">
              <Twitter class="w-5 h-5" />
            </a>
            <a href="#" class="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#FFBF00] hover:bg-white/10 transition-all duration-300 border border-white/5">
              <Facebook class="w-5 h-5" />
            </a>
          </div>
        </div>

        <!-- Links -->
        <div>
          <h4 class="text-[#FFBF00] font-black uppercase tracking-widest text-xs mb-8">Platform</h4>
          <ul class="space-y-4">
            <li><a href="/" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Beranda</a></li>
            <li><a href="/invitations" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Undangan</a></li>
            <li><a href="#features" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Fitur</a></li>
            <li><a href="#pricing" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Harga</a></li>
          </ul>
        </div>

        <!-- Company -->
        <div>
          <h4 class="text-[#FFBF00] font-black uppercase tracking-widest text-xs mb-8">Bantuan</h4>
          <ul class="space-y-4">
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Pusat Bantuan</a></li>
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Syarat & Ketentuan</a></li>
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Kebijakan Privasi</a></li>
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Kontak Kami</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="text-[#FFBF00] font-black uppercase tracking-widest text-xs mb-8">Hubungi Kami</h4>
          <ul class="space-y-4">
            <li class="flex items-center gap-3 text-slate-400 group">
              <Mail class="w-4 h-4 text-[#FFBF00] flex-shrink-0" />
              <span class="text-xs font-bold uppercase tracking-tight break-all">support@tamuu.pages.dev</span>
            </li>
            <li class="flex items-center gap-3 text-slate-400">
              <Phone class="w-4 h-4 text-[#FFBF00]" />
              <span class="text-xs font-bold uppercase tracking-tight">+62 812 3456 7890</span>
            </li>
            <li class="flex items-start gap-3 text-slate-400">
              <MapPin class="w-4 h-4 text-[#FFBF00] mt-1" />
              <span class="text-xs font-bold uppercase tracking-tight">Jakarta Selatan, Indonesia</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="h-[1px] w-full bg-white/5 mb-10"></div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
        <p class="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center sm:text-left">
          &copy; 2025 Tamuu.pages.dev. All rights reserved.
        </p>
        <div class="flex items-center gap-8">
          <span class="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Crafted by Unicorn Team</span>
        </div>
      </div>
    </div>
  </footer>
</template>
