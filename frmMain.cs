using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SpeedyUnicode
{
    public partial class frmMain : Form
    {
        private List<UnicodeCharacter> characters = new List<UnicodeCharacter>();
        private string lastSearch;
        private bool exitApp = false;
        KeyboardHook hook = new KeyboardHook();

        public frmMain()
        {
            InitializeComponent();
            Task.Run(() => LoadCharacters());
            hook.KeyPressed += new EventHandler<KeyPressedEventArgs>(SpeedyShortcut_KeyPressed);
            // register the control + alt + F12 combination as hot key.
            hook.RegisterHotKey(SpeedyUnicode.ModifierKeys.Control | SpeedyUnicode.ModifierKeys.Alt, Keys.Q);
        }

        void SpeedyShortcut_KeyPressed(object sender, KeyPressedEventArgs e)
        {
            this.Show();
        }

        private async Task<bool> LoadCharacters()
        {
            using (StreamReader sr = new StreamReader("UnicodeData.txt"))
            {
                try
                {
                    string line;
                    string[] properties;
                    while (sr.Peek() >= 0)
                    {
                        line = await sr.ReadLineAsync();
                        properties = line.Split(';');
                        characters.Add(new UnicodeCharacter
                        {
                            Number = properties[0],
                            Name = properties[1]
                        });
                    }
                }
                catch (Exception ex)
                {
                    throw;
                }

            }
            return true;
        }

        private void SearchUnicode()
        {
            var searchTerm = txtSearch.Text;
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                dgvResults.DataSource = null;
                return;
            }
            if (lastSearch == searchTerm) return;
            var found = characters.Where(c => c.Name.IndexOf(searchTerm, StringComparison.CurrentCultureIgnoreCase) >= 0).Take(10).ToList();
            dgvResults.DataSource = found;
            dgvResults.Columns.Remove("Number");
            dgvResults.Columns[0].Width = 80;
            dgvResults.Columns[0].DefaultCellStyle.Font = new Font("Lucida Sans Typewriter", 32F, GraphicsUnit.Pixel);
            dgvResults.Columns[1].Width = 400;
            lastSearch = searchTerm;
        }

        private void txtSearch_KeyUp(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter)
            {
                CopyUnicdoe();
            }
            else if (e.KeyCode == Keys.Escape)
            {
                this.Hide();
            }
            else
            {
                SearchUnicode();
            }
        }

        private void MoveSelection(int adjustRow)
        {
            if (dgvResults.SelectedCells.Count == 0) return;
            var currentSelectionIndex = dgvResults.SelectedCells[0].OwningRow.Index;
            var newSelectionIndex = (currentSelectionIndex + adjustRow);
            if (newSelectionIndex < 0 || newSelectionIndex > dgvResults.RowCount - 1) return;
            dgvResults.Rows[newSelectionIndex].Selected = true;
        }

        private void CopyUnicdoe()
        {
            if (dgvResults.SelectedRows.Count == 0) return;
            var selected = (UnicodeCharacter)dgvResults.SelectedRows[0].DataBoundItem;
            Clipboard.SetText(selected.ToString());
            this.Hide();
            ShowMessage(selected.ToString() + " copied");
        }

        private void txtSearch_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Up)
            {
                MoveSelection(-1);
            }
            else if (e.KeyCode == Keys.Down)
            {
                MoveSelection(1);
            }
        }

        private void dgvResults_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            CopyUnicdoe();
        }

        private void frmMain_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (!exitApp)
            {
                this.Hide();
                e.Cancel = true;
            }
        }

        private void notifyIcon_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            this.Show();
        }

        private void exitToolStripMenuItem_Click(object sender, EventArgs e)
        {
            exitApp = true;
            Application.Exit();
        }

        private void showToolStripMenuItem_Click(object sender, EventArgs e)
        {
            this.Show();
        }

        private void frmMain_VisibleChanged(object sender, EventArgs e)
        {
            this.CenterToScreen();
            txtSearch.Focus();
            txtSearch.SelectAll();
        }

        private void ShowMessage(string message)
        {
            Task.Run(async () =>
            {
                var display = new frmSplashMessage(message);
                display.Show();
                await Task.Delay(1000).ConfigureAwait(false);
                display.Close();
                //FadeOut(display);
            }).ConfigureAwait(false);
        }

        //private async Task<bool> FadeOut(Form o, int interval = 80)
        private void FadeOut(Form o, int interval = 80)
        {
            //Object is fully visible. Fade it out
            while (o.Opacity > 0.0)
            {
                Task.Delay(interval).ConfigureAwait(false);
                o.Opacity -= 0.05;
            }
            o.Opacity = 0; //make fully invisible      
                           // return true;
        }
    }
}
