# Maximally Admin Panel

**Internal tool for Maximally team members to manage blog posts, hackathons, people, judges, and featured content.**

## 🚀 Getting Started

1. **Access the admin panel:**
   - Open https://maximally-admin-panel.vercel.app
   - Login with your Maximally team credentials

## 📝 Managing Blog Posts

### Viewing All Blogs
- Navigate to **Blogs** in the sidebar
- See all blog posts with their status (Draft/Published)
- View creation dates and author information

### Creating a New Blog Post
1. Click **"Create Blog"** button or use the sidebar navigation
2. Fill in the required fields:
   - **Title** (auto-generates URL slug)
   - **Content** (Markdown editor with live preview)
   - **Author Name**
   - **Status** (Draft or Published)
   - **Cover Image** (optional - drag & drop or click to upload)
3. Click **"Create Blog Post"** to save

### Editing Blog Posts
1. From the Blogs list, click the **Edit** button on any post
2. Make your changes in the form
3. Click **"Save Changes"** to update

### Blog Templates
- When creating a blog, click **"Use Template"** for pre-formatted content
- Choose from: Tutorial/How-To, Announcement, Thought Leadership, or Event Recap

## 👥 Managing People

### Overview
Manage your team members across different categories: **Advisors**, **Organizing Board**, **Developers**, and **Alumni**.

### Adding New People
1. Navigate to **People** in the sidebar
2. Click **"Add Person"** button
3. Fill in the required information:
   - **Name** (required)
   - **Category** (Advisors/Organizing Board/Developers/Alumni)
   - **Role in Company** (required)
   - **Company** (required)
   - **Description** (required - brief background and expertise)
   - **Social Links** (LinkedIn, Twitter, GitHub, Website - all optional)
   - **Display Order** (for controlling order on website)
4. Click **"Create Person"** to save

### Managing People by Category
- **Tab Navigation**: Switch between different categories (Advisors, Organizing Board, Developers, Alumni)
- **Search**: Use the search bar to find people by name, role, or company
- **Counts**: Each tab shows the total number of people in that category
- **Edit**: Click the edit icon to modify person details
- **Delete**: Remove people with confirmation dialog

### People Categories
- **📋 Advisors**: Industry experts and mentors who provide strategic guidance
- **⚙️ Organizing Board**: Core team members who manage operations and events
- **💻 Developers**: Technical team members building your platform and tools
- **🎓 Alumni**: Former team members and program participants

## ⚖️ Managing Judges

### Overview
Manage judges separately from hackathon-specific judges for general use across events.

### Adding New Judges
1. Navigate to **Judges** in the sidebar
2. Click **"Add Judge"** button
3. Fill in the judge information:
   - **Name** (required)
   - **Role in Company** (required)
   - **Company** (required)
   - **Display Order** (optional)
4. Click **"Create Judge"** to save

### Managing Judges
- **Search**: Find judges by name, role, or company using the dropdown search
- **Judge Count**: View total number of judges in the header
- **Edit**: Modify judge details
- **Delete**: Remove judges with confirmation
- **Display Order**: Control the order judges appear on your website

## 🏆 Managing Hackathons

### Viewing All Hackathons  
- Navigate to **Hackathons** in the sidebar
- See all hackathons with status, dates, and location
- Status badges: Draft (yellow), Upcoming (blue), Live (green), Past (gray)

### Creating a New Hackathon
1. Click **"Create Hackathon"** button or use sidebar navigation
2. Fill in the hackathon details:
   - **Name** and **URL Slug**
   - **Tagline** (for SEO, max 150 characters)
   - **Description** (Markdown editor)
   - **Start & End Dates**
   - **Location** (optional)
   - **Status** (Draft/Upcoming/Live/Past)
   - **Prize Pool** (optional)
   - **Max Team Size** (optional)
   - **Registration Link** (optional)
   - **Cover Image** (optional)
3. Click **"Create Hackathon"** to save

### Editing Hackathons & Managing Judges
1. From the Hackathons list, click **Edit** on any hackathon
2. Use the **tabs** to switch between:
   - **Hackathon Details** - Edit all hackathon information
   - **Judges** - Add, edit, or remove judges for this hackathon

### Adding Judges to a Hackathon
1. In the Edit Hackathon page, click the **"Judges"** tab
2. Click **"Add Judge"** button
3. Fill in judge information:
   - **Name** and **Role/Title**
   - **Bio** (optional)
   - **Profile Image** (optional)
4. Click **"Add Judge"** to save

### Managing Judge Information
- **Edit**: Click the edit icon on any judge card
- **Delete**: Click the delete icon and confirm removal
- Each judge is linked to their specific hackathon

## 📊 Dashboard Overview

The dashboard provides comprehensive management tools:

### Statistics Cards
- **Blog Statistics**: Total blogs, published count, drafts
- **Hackathon Statistics**: Total hackathons, live events, upcoming events  
- **Quick Actions**: Fast links to create new content

### Featured Content Management

#### 🫂 Featured Core Team
1. **Purpose**: Select 3 core team members to feature prominently on your website
2. **How to use**:
   - Use the searchable dropdowns to find people from your People database
   - Search by name, role, or company within each dropdown
   - Select different people for each of the 3 slots
   - Click **"Update Core Team"** to save changes
3. **Features**:
   - Live search within dropdowns
   - Clear selection with X button
   - Visual preview showing selected person's details

#### ⚖️ Featured Judges
1. **Purpose**: Select 3 judges to feature prominently on your website
2. **How to use**:
   - Use the searchable dropdowns to find judges from your Judges database
   - Search by name, role, or company within each dropdown
   - Select different judges for each of the 3 slots
   - Click **"Update Judges"** to save changes
3. **Features**:
   - Live search within dropdowns
   - Clear selection with X button
   - Visual preview showing selected judge's details

#### 🏆 Featured Hackathon
- Select a hackathon to feature on your website
- Choose from existing hackathons
- Click **"Update"** to save changes

### Recent Content
- **Recent Blogs**: Latest blog posts with quick edit access
- **Recent Hackathons**: Latest events with quick edit access

## 📱 Mobile & Tablet Support

The admin panel works on all devices:
- **Desktop**: Full feature access with optimal layout
- **Tablet**: Responsive design with touch-friendly controls
- **Mobile**: Simplified layout with collapsible sidebar

## 🌟 Key Features

### Advanced Search & Filtering
- **People Management**: Search across all categories by name, role, company, or description
- **Judges Management**: Quick search functionality in management interface
- **Featured Selections**: In-dropdown search for finding people and judges instantly

### Smart Form Handling
- **Auto-generated Slugs**: Blog titles automatically create URL-friendly slugs
- **Form Validation**: Required fields with helpful error messages
- **Draft Support**: Save work in progress without publishing

### Responsive Design
- **Mobile Optimized**: Fully functional on all device sizes
- **Touch Friendly**: Optimized for tablet and mobile interactions
- **Collapsible Navigation**: Space-efficient sidebar on smaller screens

## 💡 Tips & Best Practices

### For Blog Posts:
- Use **Draft** status while working on content
- Add **cover images** for better visual appeal
- Utilize **Markdown** for rich formatting (links, images, code blocks)
- **Preview** your content before publishing
- Use **templates** to maintain consistent formatting

### For Hackathons:
- Set **status** appropriately as events progress (Draft → Upcoming → Live → Past)
- Add **judges early** to build credibility
- Include **registration links** for participant sign-ups
- Use **taglines** for SEO-friendly descriptions

### For People Management:
- **Complete Profiles**: Fill in all required fields for better presentation
- **Consistent Descriptions**: Use similar formatting across team members
- **Social Links**: Add LinkedIn, GitHub, etc. for networking
- **Display Order**: Use numbers to control how people appear on your website
- **Categories**: Keep people in appropriate categories (Advisors, Board, Developers, Alumni)

### For Featured Content:
- **Strategic Selection**: Choose people and judges that best represent your organization
- **Regular Updates**: Refresh featured content periodically
- **Diverse Representation**: Consider featuring people from different backgrounds and roles
- **Current Information**: Ensure featured people have up-to-date profiles

### Content Guidelines:

#### Images:
- **Recommended formats**: PNG, JPG, GIF
- **Maximum size**: 10MB per file
- **Blog covers**: Wide format works best (16:9 ratio)
- **Judge/People profiles**: Square images work best (1:1 ratio)

#### Text Content:
- **Descriptions**: Keep person/judge descriptions concise but informative (2-3 sentences)
- **Roles**: Use consistent role naming conventions
- **Company Names**: Use official company names for consistency

## 🔧 Troubleshooting

**Can't login?**
- Ensure you have a valid Maximally team account
- Check your internet connection
- Try refreshing the page

**Images won't upload?**
- Check file size (max 10MB)
- Ensure file is an image format (PNG, JPG, GIF)
- Try refreshing the page and uploading again

**Content not saving?**
- Check that all required fields are filled (marked with *)
- Ensure you have a stable internet connection
- Try again after a few moments

**Person/Judge not appearing in correct category?**
- Verify the category was selected correctly when creating/editing
- Check that you're viewing the correct tab in People Management
- Refresh the page if changes don't appear immediately

**Featured content not updating?**
- Ensure you clicked the "Update" button after making selections
- Check that the people/judges you selected still exist in the database
- Try refreshing the page and making the selection again

**Search not working in dropdowns?**
- Type slowly and wait for results to filter
- Check spelling of search terms
- Try searching by different fields (name, company, role)

---

**Need help?** Contact the development team or check the browser console for error messages.
