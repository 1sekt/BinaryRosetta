package com.example.demo.model; // 自分のパッケージ名に合わせてください

import java.io.Serializable;

// プレイヤーの状態を保存するためのクラス
public class Player implements Serializable {
    private String affinity;        // "LIGHT" または "DARK"
    private boolean completedRosetta; // ロゼッタストーンを終えたら true

    // コンストラクタ（初期状態）
    public Player() {
        this.affinity = "NONE"; // 最初は未設定
        this.completedRosetta = false;
    }

    // ゲッターとセッター（右クリック > ソース > GetterおよびSetterの生成 で自動作成できます）
    public String getAffinity() { return affinity; }
    public void setAffinity(String affinity) { this.affinity = affinity; }
    public boolean isCompletedRosetta() { return completedRosetta; }
    public void setCompletedRosetta(boolean completedRosetta) { this.completedRosetta = completedRosetta; }
}
