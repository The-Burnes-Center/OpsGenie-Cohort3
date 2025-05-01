"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
class Utils {
    static copyDirRecursive(sourceDir, targetDir) {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir);
        }
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
            const sourceFilePath = path.join(sourceDir, file);
            const targetFilePath = path.join(targetDir, file);
            const stats = fs.statSync(sourceFilePath);
            if (stats.isDirectory()) {
                Utils.copyDirRecursive(sourceFilePath, targetFilePath);
            }
            else {
                fs.copyFileSync(sourceFilePath, targetFilePath);
            }
        }
    }
}
exports.Utils = Utils;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUE4QjtBQUM5QixnREFBa0M7QUFFbEMsTUFBc0IsS0FBSztJQUN6QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBaUIsRUFBRSxTQUFpQjtRQUMxRCxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzlCLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFeEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUN6QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRTFDLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7Z0JBQ3hCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDekQsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLEVBQUUsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztDQUVGO0FBckJELHNCQXFCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJub2RlOmZzXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xyXG5cclxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFV0aWxzIHtcclxuICBzdGF0aWMgY29weURpclJlY3Vyc2l2ZShzb3VyY2VEaXI6IHN0cmluZywgdGFyZ2V0RGlyOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXREaXIpKSB7XHJcbiAgICAgIGZzLm1rZGlyU3luYyh0YXJnZXREaXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoc291cmNlRGlyKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcclxuICAgICAgY29uc3Qgc291cmNlRmlsZVBhdGggPSBwYXRoLmpvaW4oc291cmNlRGlyLCBmaWxlKTtcclxuICAgICAgY29uc3QgdGFyZ2V0RmlsZVBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCBmaWxlKTtcclxuICAgICAgY29uc3Qgc3RhdHMgPSBmcy5zdGF0U3luYyhzb3VyY2VGaWxlUGF0aCk7XHJcblxyXG4gICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgIFV0aWxzLmNvcHlEaXJSZWN1cnNpdmUoc291cmNlRmlsZVBhdGgsIHRhcmdldEZpbGVQYXRoKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmcy5jb3B5RmlsZVN5bmMoc291cmNlRmlsZVBhdGgsIHRhcmdldEZpbGVQYXRoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbn1cclxuIl19