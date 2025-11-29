# Firebase API密钥配置指南

## 步骤1：在Firebase Console中创建配置文档

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 选择您的项目：`badminton-fc92c`
3. 进入 **Firestore Database**
4. 点击 **开始集合** (Start collection)

## 步骤2：创建配置集合

### 集合ID
```
config
```

### 文档ID
```
apiKeys
```

### 字段
添加以下字段：

| 字段名 | 类型 | 值 |
|--------|------|-----|
| `geminiKey` | string |  |

## 步骤3：设置Firestore安全规则

在 **Firestore Database → 规则** 中，添加以下规则：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允许所有人读取config集合（用于获取API密钥）
    match /config/{document=**} {
      allow read: if true;
      allow write: if false; // 只有管理员可以写入
    }
    
    // 其他集合的规则
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 步骤4：验证配置

1. 打开浏览器控制台
2. 刷新应用页面
3. 查看控制台输出：
   - ✅ 应该看到：`✅ API密钥已从Firebase加载`
   - ❌ 如果看到：`⚠️ Firebase中未找到API密钥配置`，请检查步骤1-2

## 步骤5：测试聊天功能

1. 点击右下角的绿色悬浮按钮
2. 点击 "Start a Conversation"
3. 发送一条测试消息
4. 确认AI回复正常

## 安全说明

⚠️ **重要提醒**：

虽然API密钥存储在Firebase中，但由于Firestore的读取规则设置为 `allow read: if true`，任何人都可以通过浏览器DevTools查看到这个密钥。

**这个方案适用于**：
- 个人项目
- 小型团队项目
- 不在意API密钥被查看的场景

**如果需要更高安全性**，建议使用Firebase Cloud Functions或Vercel Functions作为后端代理。

## 故障排除

### 问题1：控制台显示 "⚠️ Firebase中未找到API密钥配置"
**解决方案**：
- 确认Firestore中存在 `config/apiKeys` 文档
- 确认字段名为 `geminiKey`（区分大小写）

### 问题2：聊天功能显示 "API密钥未加载"
**解决方案**：
- 刷新页面，等待API密钥加载完成
- 检查浏览器控制台是否有错误信息
- 确认Firestore安全规则允许读取

### 问题3：Firestore权限被拒绝
**解决方案**：
- 检查Firestore安全规则
- 确保 `config` 集合的读取权限设置为 `allow read: if true`

## 完成！

配置完成后，您的应用将自动从Firebase加载API密钥，用户无需任何配置即可使用聊天功能。

