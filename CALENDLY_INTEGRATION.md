# 📅 Calendly Integration

Your AI assistant now supports Calendly integration for creating meeting invitees!

## 🚀 **Setup**

### **1. Get Your Calendly API Token**
1. Visit [Calendly Developer Portal](https://developer.calendly.com/)
2. Create an application and get your API token
3. Add it to your environment files:

```bash
# Add to .env.local (frontend) and backend/.env
CALENDLY_TOKEN=your_calendly_api_token_here
```

### **2. Available Commands**

## 📝 **create_calendly_invitee Tool**

### **Purpose:**
Create invitees for scheduled Calendly events.

### **Parameters:**
- **`email`**: Email address of the invitee (required)
- **`name`**: Full name of the invitee (required)  
- **`eventType`**: Calendly event type ID (required)

### **Example Commands:**
```bash
"Add john.doe@email.com to my meeting as John Doe"
"Create Calendly invitee for sarah@company.com named Sarah Johnson"  
"Invite mike.wilson@email.com to event evt_123 as Mike Wilson"
```

### **Smart Detection:**
The AI can automatically extract:
- **Email addresses** from natural language
- **Names** from context  
- **Event references** (you'll need to specify the event ID)

## 🎯 **Usage Examples**

### **Basic Invitee Creation:**
```bash
User: "Add sarah.johnson@company.com to my 3pm meeting as Sarah Johnson"
```

### **With Event Type:**
```bash  
User: "Create Calendly invitee for john@email.com named John Smith for event type evt_abc123"
```

### **Bulk Operations (Future):**
```bash
User: "Add these people to my meeting: john@email.com as John, sarah@email.com as Sarah"
```

## 🔧 **Technical Details**

### **API Endpoint:**
```
POST https://api.calendly.com/scheduled_events/{eventType}/invitees
```

### **Request Format:**
```json
{
  "email": "invitee@example.com",
  "name": "Invitee Name"
}
```

### **Response:**
Returns the created invitee object with Calendly metadata.

## ⚠️ **Requirements**

### **Environment Setup:**
- Valid Calendly API token
- Proper permissions for the events you want to manage
- Event type IDs for your scheduled events

### **Error Handling:**
- Missing API token → Clear error message
- Invalid event type → Calendly API error response
- Network issues → Graceful error handling

## 🎮 **Try It Out**

### **Test Commands:**
```bash
"Add test@example.com to my meeting as Test User"
"Create Calendly invitee for demo@company.com named Demo Person"
```

### **Get Event Types:**
You'll need your Calendly event type IDs. These look like:
- `https://api.calendly.com/event_types/ABC123`
- Use just the ID part: `ABC123`

---

**🎉 Your assistant can now manage Calendly invitees with natural language!**

*Note: You'll need to provide your actual Calendly API token and event type IDs for this to work.* 