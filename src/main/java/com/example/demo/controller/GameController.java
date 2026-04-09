package com.example.demo.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.demo.model.MemoData;
import com.example.demo.model.StageData;

import tools.jackson.databind.ObjectMapper;

@Controller
public class GameController {

    private String savedMemo = ""; 
    private int lightClearCount = 0;        
    private int darkClearCount = 0;         
    
    // 各ステージの入力内容を保存 (StageID -> Map<WordID, String>)
    private Map<Integer, Map<String, String>> stageAnswers = new HashMap<>();
    
    // 最大到達ステージ (初期値は0)
    private int maxReachedStage = 0;

    @GetMapping("/")
    public String index() {
        return "index"; // これで templates/index.html が表示されます
    }

    
    @PostMapping("/api/stage/submit/{id}")
    @ResponseBody 
    public String submitStage(@PathVariable int id, @RequestBody Map<String, String> answers) {
        stageAnswers.put(id, answers);
        // クリアしたのが現在の最大ステージなら、次を解放
        if (id >= maxReachedStage) {
            maxReachedStage = id + 1;
        }
        return "Success";
    }

    @GetMapping("/api/progress")
    @ResponseBody 
    public int getMaxReachedStage() {
        return this.maxReachedStage;
    }

    // --- 既存のAPI群（維持） ---
    @PostMapping("/api/player/faction")
    @ResponseBody 
    public String setFaction(@RequestBody String faction) {
        return "Faction updated";
    }

    @PostMapping("/api/stage/clear")
    @ResponseBody 
    public String clearStage(@RequestBody String faction) {
        if (faction.contains("light")) lightClearCount++;
        else darkClearCount++;
        return "Status Updated";
    }
    
    @GetMapping("/api/player/world-status")
    @ResponseBody 
    public Map<String, Object> getWorldStatus() {
        int diff = lightClearCount - darkClearCount;
        String bias = (diff >= 5) ? "light" : (diff <= -5 ? "dark" : "none");
        Map<String, Object> status = new HashMap<>();
        status.put("bias", bias);
        status.put("diff", Math.abs(diff));
        return status;
    }

    @GetMapping("/api/stage/{id}")
    @ResponseBody 
    public StageData getStage(@PathVariable int id) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        // stage0.json も読み込めるようになります
        ClassPathResource res = new ClassPathResource("static/data/stage" + id + ".json");
        return mapper.readValue(res.getInputStream(), StageData.class);
    }

    @PostMapping("/api/memo/save")
    @ResponseBody 
    public String saveMemo(@RequestBody MemoData memo) {
        this.savedMemo = memo.getContent();
        return "Success";
    }

    @GetMapping("/api/memo/load")
    @ResponseBody 
    public String loadMemo() {
        return this.savedMemo;
    }
}
