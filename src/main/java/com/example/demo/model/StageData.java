package com.example.demo.model;

import java.util.List;

import lombok.Data;

@Data
public class StageData {
    private int id;
    private String stageName;
    private String difficulty;
    private String prologue; // 追加：地の文（前）
    private String epilogue; // 追加：地の文（後）
    private List<WordData> words;

    @Data
    public static class WordData {
        private String id;
        private int size;
        private int[][] pattern;
        private SideData light;
        private SideData dark;
        private SideData trueSide;
    }

    @Data
    public static class SideData {
        private String ans;
        private String text;
    }
}

