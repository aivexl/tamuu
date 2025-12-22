<script setup lang="ts">
import { Sparkles, Instagram, Twitter, Facebook, Mail, Phone, MapPin } from 'lucide-vue-next';
</script>

<template>
  <footer class="bg-slate-900 pt-20 pb-10 px-6">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <!-- Brand -->
        <div class="space-y-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles class="w-7 h-7 text-white" />
            </div>
            <span class="text-3xl font-black text-white tracking-tighter">Tamuu</span>
          </div>
          <p class="text-slate-400 text-sm leading-relaxed font-medium">
            Platform undangan digital tercanggih di Indonesia. Menghadirkan kemewahan dan kemudahan dalam setiap momen berharga Anda.
          </p>
          <div class="flex items-center gap-4">
            <a href="#" class="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all duration-300">
              <Instagram class="w-5 h-5" />
            </a>
            <a href="#" class="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all duration-300">
              <Twitter class="w-5 h-5" />
            </a>
            <a href="#" class="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all duration-300">
              <Facebook class="w-5 h-5" />
            </a>
          </div>
        </div>

        <!-- Links -->
        <div>
          <h4 class="text-white font-black uppercase tracking-widest text-xs mb-8">Platform</h4>
          <ul class="space-y-4">
            <li><a href="/" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Beranda</a></li>
            <li><a href="/templates" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Template</a></li>
            <li><a href="#features" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Fitur</a></li>
            <li><a href="#pricing" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Harga</a></li>
          </ul>
        </div>

        <!-- Company -->
        <div>
          <h4 class="text-white font-black uppercase tracking-widest text-xs mb-8">Bantuan</h4>
          <ul class="space-y-4">
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Pusat Bantuan</a></li>
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Syarat & Ketentuan</a></li>
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Kebijakan Privasi</a></li>
            <li><a href="#" class="text-slate-400 hover:text-white transition-colors text-sm font-bold">Kontak Kami</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="text-white font-black uppercase tracking-widest text-xs mb-8">Hubungi Kami</h4>
          <ul class="space-y-4">
            <li class="flex items-center gap-3 text-slate-400">
              <Mail class="w-4 h-4 text-indigo-400" />
              <span class="text-xs font-bold uppercase tracking-tight">support@tamuu.id</span>
            </li>
            <li class="flex items-center gap-3 text-slate-400">
              <Phone class="w-4 h-4 text-indigo-400" />
              <span class="text-xs font-bold uppercase tracking-tight">+62 812 3456 7890</span>
            </li>
            <li class="flex items-start gap-3 text-slate-400">
              <MapPin class="w-4 h-4 text-indigo-400 mt-1" />
              <span class="text-xs font-bold uppercase tracking-tight">Jakarta Selatan, Indonesia</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="h-[1px] w-full bg-slate-800 mb-10"></div>

      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <p class="text-slate-500 text-xs font-bold uppercase tracking-widest">
          &copy; 2025 Tamuu.id. All rights reserved.
        </p>
        <div class="flex items-center gap-8">
          <span class="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Crafted by Unicorn Team</span>
        </div>
      </div>
    </div>
  </footer>
</template>
