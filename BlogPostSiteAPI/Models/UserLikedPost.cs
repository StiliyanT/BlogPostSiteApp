using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BlogPostSiteAPI.Models
{
    public class UserLikedPost
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public string UserId { get; set; } = null!;

        [Required]
        public Guid BlogPostId { get; set; }

        public DateTime LikedOn { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(BlogPostId))]
        public BlogPost? BlogPost { get; set; }
    }
}
